set -e
cd /home/user/moggbot
cp index.html demo.html
for x in p2 p3; do python3 demo-tools/$x.py demo.html; done
python3 demo-tools/demomode.py demo.html
echo built
