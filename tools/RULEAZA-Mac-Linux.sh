#!/bin/bash
# ====================================================
#  PlayArcadeX - Generator surse jocuri (Mac/Linux)
#  Ruleaza: bash RULEAZA-Mac-Linux.sh
#  (sau dublu-click daca terminalul e setat sa execute)
#  Fereastra NU se inchide automat.
# ====================================================
cd "$(dirname "$0")"
echo "Pornesc generatorul de surse..."
echo ""

python3 generate_sources.py "$@"
CODE=$?

if [ $CODE -ne 0 ]; then
    echo ""
    echo "[Scriptul a returnat o eroare - vezi mesajul de mai sus]"
fi

echo ""
echo "===================================================="
read -p "Apasa ENTER pentru a inchide..."
