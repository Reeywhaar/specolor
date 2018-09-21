img/spectrum.png: img/spectrum.psd
	convert img/spectrum.psd[0] -strip png32:img/spectrum.png
	pngcrush --brute --ow img/spectrum.png

usage.png: usage.psd
	convert usage.psd[0] -strip png32:usage.png
	pngcrush --brute --ow usage.png

build: img/spectrum.png
	rsync -arvuz --delete ./js ./build/
	rsync -arvuz --delete ./jsx ./build/
	rsync -arvuz --delete ./css ./build/
	rsync -arvuz --delete ./html ./build/
	rsync -arvuz --delete ./CSXS ./build/
	rsync -arvuz --delete ./img ./build/ --exclude "*.psd"
	rsync -arvuz --delete ./icon*.png ./build/

# Mac only
install: build
	rsync -arvuz --delete ./build/ ~/Library/Application\ Support/Adobe/CEP/extensions/Specolor/ --exclude .DS_Store

.PHONY: build install
