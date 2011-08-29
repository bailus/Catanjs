rm sprite.css
touch sprite.css
cd SD
for f in *
do
  echo -n .$f >> ../sprite.css
  echo -n ' { background-image:url(data:image/png;base64,' >> ../sprite.css
  base64 --wrap=0 $f >> ../sprite.css
  echo '); }' >> ../sprite.css
done
cd ..
