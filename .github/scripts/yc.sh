#!/usr/bin/env bash
# Управление функциями mogg в Yandex Cloud из GitHub Actions.
# Ключ сервисного аккаунта — в секрете репозитория YC_SA_KEY (JSON авторизованного ключа).
# ВАЖНО: репозиторий публичный, логи видны всем — значения переменных окружения и ключи НЕ печатаем никогда.
#
#   yc.sh info                       — что есть в каталоге: функции, публичность, шлюзы (без секретов)
#   yc.sh deploy mogg-pay,mogg-bot   — новая версия функции из кода репозитория (настройки и переменные сохраняются)
#   yc.sh close-public               — закрыть прямой доступ к функциям, которые шлюз вызывает от сервисного аккаунта
set -euo pipefail
set +x
ACTION="${1:-info}"; FUNCS="${2:-mogg-chat,mogg-pay,mogg-bot}"
API=https://serverless-functions.api.cloud.yandex.net/functions/v1
GW=https://serverless-apigateway.api.cloud.yandex.net/apigateways/v1
OPS=https://operation.api.cloud.yandex.net/operations

[ -n "${YC_SA_KEY:-}" ] || { echo "Нет секрета YC_SA_KEY"; exit 1; }
umask 077; printf '%s' "$YC_SA_KEY" > /tmp/key.json
yc config set service-account-key /tmp/key.json >/dev/null
TOKEN=$(yc iam create-token); echo "::add-mask::$TOKEN"; rm -f /tmp/key.json
H=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
SA_ID=$(printf '%s' "$YC_SA_KEY" | jq -r .service_account_id)
FOLDER="${FOLDER_ID:-}"
if [ -z "$FOLDER" ]; then FOLDER=$(curl -sf "${H[@]}" "https://iam.api.cloud.yandex.net/iam/v1/serviceAccounts/$SA_ID" | jq -r .folderId); fi
echo "Каталог: $FOLDER"

fn_id() { curl -sf "${H[@]}" -G "$API/functions" --data-urlencode "folderId=$FOLDER" --data-urlencode "filter=name=\"$1\"" | jq -r '.functions[0].id // empty'; }
latest() { curl -sf "${H[@]}" -G "$API/versions:byTag" --data-urlencode "functionId=$1" --data-urlencode 'tag=$latest'; }
is_public() { curl -sf "${H[@]}" "$API/functions/$1:listAccessBindings" | jq -r '[.accessBindings[]? | select(.subject.id=="allUsers")] | length > 0'; }
wait_op() {
  local id="$1" i r
  for i in $(seq 1 60); do
    r=$(curl -sf "${H[@]}" "$OPS/$id")
    if [ "$(jq -r '.done // false' <<<"$r")" = "true" ]; then
      if jq -e '.error' <<<"$r" >/dev/null; then echo "  ✗ ошибка: $(jq -r '.error.message' <<<"$r")"; return 1; fi
      return 0
    fi
    sleep 3
  done
  echo "  ✗ не дождались операции $id"; return 1
}

case "$ACTION" in
info)
  echo "== Функции =="
  curl -sf "${H[@]}" -G "$API/functions" --data-urlencode "folderId=$FOLDER" | jq -r '.functions[]? | "\(.id) \(.name)"' | while read -r id name; do
    v=$(latest "$id" || echo '{}')
    echo "- $name: публичная=$(is_public "$id"), $(jq -r '"runtime=\(.runtime) entry=\(.entrypoint) SA=\(.serviceAccountId // "нет") переменные=[\((.environment // {}) | keys | join(","))] секреты-lockbox=\((.secrets // []) | length)"' <<<"$v")"
  done
  echo "== Шлюзы API =="
  curl -sf "${H[@]}" -G "$GW/apigateways" --data-urlencode "folderId=$FOLDER" | jq -r '.apiGateways[]? | "\(.id) \(.name) \(.domain)"' | while read -r id name domain; do
    echo "- $name ($domain)"
    curl -sf "${H[@]}" "$GW/apigateways/$id:spec" | jq -r '.openapiSpec' > /tmp/spec.yaml || true
    # из спецификации печатаем только пути и интеграции (id функций и сервисных аккаунтов — не секреты)
    grep -nE '^\s{2}/|x-yc-apigateway-integration|type: cloud_functions|function_id|service_account_id|type: http|url:' /tmp/spec.yaml | sed 's/^/    /' || true
  done
  ;;
deploy)
  IFS=',' read -ra LIST <<<"$FUNCS"
  for F in "${LIST[@]}"; do
    case "$F" in mogg-chat) DIR=chat ;; mogg-pay) DIR=pay ;; mogg-bot) DIR=bot ;; *) echo "✗ $F: неизвестная функция"; exit 1 ;; esac
    echo "== $F ← $DIR/index.js =="
    ID=$(fn_id "$F"); [ -n "$ID" ] || { echo "  ✗ функция не найдена в каталоге"; exit 1; }
    CUR=$(latest "$ID")
    # переносим все настройки последней версии, меняем только код (+ добавки ниже)
    BODY=$(jq --arg fid "$ID" '{functionId:$fid} + ({runtime, entrypoint, resources, executionTimeout, serviceAccountId, environment, secrets, connectivity, logOptions, storageMounts, mounts, asyncInvocationConfig, concurrency} | with_entries(select(.value != null)))' <<<"$CUR")
    if [ "$F" = "mogg-bot" ]; then
      PAY=$(latest "$(fn_id mogg-pay)")
      BUCKET=$(jq -r '.environment.BUCKET // empty' <<<"$PAY"); PAY_SA=$(jq -r '.serviceAccountId // empty' <<<"$PAY")
      [ -n "$BUCKET" ] && echo "::add-mask::$BUCKET"
      BODY=$(jq --arg b "$BUCKET" --arg o "${OWNER_ID:-}" --arg sa "$PAY_SA" '
        .environment = ((.environment // {}) + (if $b != "" then {BUCKET:$b} else {} end) + (if $o != "" then {OWNER_ID:$o} else {} end))
        | if (.serviceAccountId // "") == "" and $sa != "" then .serviceAccountId = $sa else . end' <<<"$BODY")
      echo "  + BUCKET из mogg-pay: $([ -n "$BUCKET" ] && echo да || echo НЕТ), OWNER_ID: $([ -n "${OWNER_ID:-}" ] && echo да || echo не задан), сервисный аккаунт: $(jq -r '.serviceAccountId // "нет"' <<<"$BODY")"
    fi
    rm -rf /tmp/pkg && mkdir -p /tmp/pkg && cp "$DIR/index.js" /tmp/pkg/ && (cd /tmp/pkg && zip -q -X pkg.zip index.js)
    BODY=$(jq --arg c "$(base64 -w0 /tmp/pkg/pkg.zip)" '.content = $c' <<<"$BODY")
    OP=$(curl -s "${H[@]}" -X POST "$API/versions" -d "$BODY")
    OPID=$(jq -r '.id // empty' <<<"$OP")
    [ -n "$OPID" ] || { echo "  ✗ не создалась версия: $(jq -r '.message // "?"' <<<"$OP")"; exit 1; }
    wait_op "$OPID" && echo "  ✓ новая версия развёрнута (переменные: $(jq -r '(.environment // {}) | keys | join(",")' <<<"$BODY"))"
  done
  ;;
close-public)
  # закрываем только функции, которые все шлюзы вызывают с service_account_id; остальные — оставляем и пишем почему
  SPECS=""
  for gid in $(curl -sf "${H[@]}" -G "$GW/apigateways" --data-urlencode "folderId=$FOLDER" | jq -r '.apiGateways[]?.id'); do
    SPECS+=$(curl -sf "${H[@]}" "$GW/apigateways/$gid:spec" | jq -r '.openapiSpec')$'\n'
  done
  curl -sf "${H[@]}" -G "$API/functions" --data-urlencode "folderId=$FOLDER" | jq -r '.functions[]? | "\(.id) \(.name)"' | while read -r id name; do
    [ "$(is_public "$id")" = "true" ] || { echo "- $name: уже закрыта"; continue; }
    if [ "$name" = "mogg-bot" ] && ! grep -q "$id" <<<"$SPECS"; then echo "- $name: вебхук Telegram идёт напрямую — оставляю (там своя проверка секрета)"; continue; fi
    BLOCK=$(awk -v id="$id" 'index($0,id){f=1} f{print; n++} n>6{exit}' <<<"$SPECS")
    if [ -z "$BLOCK" ]; then echo "- $name: шлюз её не вызывает — оставляю открытой, проверь вручную"; continue; fi
    if ! grep -q service_account_id <<<"$BLOCK$(awk -v id="$id" '{a[NR]=$0} index($0,id){for(i=NR-6;i<NR;i++) print a[i]}' <<<"$SPECS")"; then echo "- $name: шлюз вызывает без сервисного аккаунта — закрывать нельзя, приложение сломается"; continue; fi
    NEW=$(curl -sf "${H[@]}" "$API/functions/$id:listAccessBindings" | jq '{accessBindings: [.accessBindings[]? | select(.subject.id != "allUsers")]}')
    OP=$(curl -s "${H[@]}" -X POST "$API/functions/$id:setAccessBindings" -d "$NEW")
    wait_op "$(jq -r .id <<<"$OP")" && echo "- $name: ✓ прямой доступ закрыт"
  done
  ;;
*) echo "Неизвестное действие $ACTION"; exit 1 ;;
esac
