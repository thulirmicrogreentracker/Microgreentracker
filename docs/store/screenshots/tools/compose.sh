#!/bin/bash
# compose.sh <in.png> <out.png> <canvasW> <canvasH> <shotW> "<headline>" "<sub-line>"
# Store image: green gradient, headline and sub-line at the top, the screenshot below with rounded corners and a shadow.
in=$1; out=$2; W=$3; H=$4; SW=$5; head=$6; sub=$7
BOLD="/System/Library/Fonts/Supplemental/Arial Bold.ttf"; REG="/System/Library/Fonts/Supplemental/Arial.ttf"
T=$(mktemp -d)
magick "$in" -resize ${SW}x "$T/shot.png"
SH=$(magick identify -format "%h" "$T/shot.png")
R=$(( SW / 18 ))
magick "$T/shot.png" \( -size ${SW}x${SH} xc:none -fill white -draw "roundrectangle 0,0 $((SW-1)),$((SH-1)) $R,$R" \) -compose DstIn -composite "$T/round.png"
magick "$T/round.png" \( +clone -background '#00000066' -shadow 60x$((W/60))+0+$((W/80)) \) +swap -background none -layers merge +repage "$T/shadow.png"
HS=$(( W * 64 / 1000 )); SS=$(( W * 38 / 1000 ))
TOP=$(( H * 6 / 100 ))
magick -size ${W}x${H} gradient:'#10b981-#065f46' \
  -font "$BOLD" -pointsize $HS -fill white -gravity north -annotate +0+$TOP "$head" \
  -font "$REG" -pointsize $SS -fill '#d1fae5' -gravity north -annotate +0+$(( TOP + HS * 135 / 100 )) "$sub" \
  "$T/shadow.png" -gravity south -geometry +0+$(( H - (TOP + HS * 135 / 100 + SS * 2) - $(magick identify -format "%h" "$T/shadow.png") )) -composite \
  -flatten -quality 92 "$out"
rm -rf "$T"
