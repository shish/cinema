
bg.png: bg.src.png Makefile
	convert bg.src.png \
		-fill '#AFA' -opaque white \
		-fill '#8C8' -opaque black \
		bg.green.png
	pngquant --posterize 1 - < bg.green.png > bg.png
	rm bg.green.png
