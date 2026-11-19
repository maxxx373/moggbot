set -e
cd "$(dirname "$0")/.."
cp index.html demo.html
for x in "$@"; do python3 demo-tools/$x.py demo.html; done
python3 demo-tools/demomode.py demo.html
echo built
