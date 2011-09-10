#!/bin/bash

cd images
for t in *
do
  cd $t
  echo '/* Generated by makeThemes.sh */' > ../../themes/${t}.css
  for f in *
  do
    mime=$(file --mime-type -b $f)
    if [ $mime == "text/*" ]; then
      cat $f >> ../../themes/${t}.css
      echo '' >> ../../themes/${t}.css
    else
      echo -n .$f >> ../../themes/${t}.css
      echo -n " { background-image:url(\"data:$mime;base64," >> ../../themes/${t}.css
      base64 --wrap=0 $f >> ../../themes/${t}.css
      echo '"); }' >> ../../themes/${t}.css
    fi
  done
  cd ..
done
cd ..
