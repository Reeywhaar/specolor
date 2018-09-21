function getColor() {
	return JSON.stringify([
		app.foregroundColor.rgb.red,
		app.foregroundColor.rgb.green,
		app.foregroundColor.rgb.blue,
	]);
}

function getBGColor() {
	return JSON.stringify([
		app.backgroundColor.rgb.red,
		app.backgroundColor.rgb.green,
		app.backgroundColor.rgb.blue,
	]);
}

function setColor(red, green, blue) {
	app.foregroundColor.rgb.red = red;
	app.foregroundColor.rgb.green = green;
	app.foregroundColor.rgb.blue = blue;
}

function setBGColor(red, green, blue) {
	app.backgroundColor.rgb.red = red;
	app.backgroundColor.rgb.green = green;
	app.backgroundColor.rgb.blue = blue;
}