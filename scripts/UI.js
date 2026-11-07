// Global finger event variables
$.Finger.motionThreshold = 50;
$.Finger.pressDuration = 450;
var eventThreshold = 750; // time between finger events (in ms)
		
// Get url parameters to determine which card this is (null = Rules card)
/* For example, the url https://onecardmaze?card=Beach would load the Beach card

Adding a new card to the website repository:
* Create a new folder in the "cards" directory
* Rename that folder to be whatever name you'll use in the url
* In that folder, upload your two card files, naming them "front.png" and "back.png"
*/
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var cardFolder = 'Rules'; // default

if (urlParams.has('card')) {
	cardFolder = urlParams.get('card');
}
document.querySelector('.front.card').innerHTML = '<img src="cards/' + cardFolder + '/front.png">'; // ?' + Date.now() + '">';
document.querySelector('.back.card').innerHTML = '<img src="cards/' + cardFolder + '/back.png">'; // ?' + Date.now() + '">';

// Resize card dimensions
document.querySelector('#card').style.height = (document.querySelector('#card').offsetWidth) * 1.4 + 'px';
window.addEventListener('resize', function() {
    document.querySelector('#card').style.height = (document.querySelector('#card').offsetWidth) * 1.4 + 'px';
});

var lastTime, timeDiff;
var rDegrees = 0;
var xDegrees = 0;
var yDegrees = 0;

// Finger / mouse horizontal/vertical swipe to flip card
$('#card').on('drag', function(e) {
	// Skip event if time threshold between events hasn't been met
	if (lastTime) {
		timeDiff = event.timeStamp - lastTime;
		if (timeDiff < eventThreshold) {
			return false;
		}
	} 
	lastTime = event.timeStamp;
	
	// default card orientation
	if ((Math.abs(rDegrees % 360)) == 0) {
		if (e.orientation == 'vertical') {
			if (e.direction == 1) {
				xDegrees -= 180;
			}
			else if (e.direction == -1) {
				xDegrees += 180;
			}
		}
		if (e.orientation == 'horizontal') {
			if (e.direction == 1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees -= 180;
				}
				else {
					yDegrees += 180;
				}
			}
			else if (e.direction == -1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees += 180;
				}
				else {
					yDegrees -= 180;
				}
			}
		}
	}
	
	if ((Math.abs(rDegrees % 360)) == 90) {
		if (e.orientation == 'horizontal') {
			if (e.direction == -1) {
				xDegrees -= 180;
			}
			else if (e.direction == 1) {
				xDegrees += 180;
			}
		}
		if (e.orientation == 'vertical') {
			if (e.direction == 1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees -= 180;
				}
				else {
					yDegrees += 180;
				}
			}
			else if (e.direction == -1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees += 180;
				}
				else {
					yDegrees -= 180;
				}
			}
		}
	}
	
	if ((Math.abs(rDegrees % 360)) == 180) {
		if (e.orientation == 'vertical') {
			if (e.direction == -1) {
				xDegrees -= 180;
			}
			else if (e.direction == 1) {
				xDegrees += 180;
			}
		}
		if (e.orientation == 'horizontal') {
			if (e.direction == -1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees -= 180;
				}
				else {
					yDegrees += 180;
				}
			}
			else if (e.direction == 1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees += 180;
				}
				else {
					yDegrees -= 180;
				}
			}
		}
	}
	
	if ((Math.abs(rDegrees % 360)) == 270) {
		if (e.orientation == 'horizontal') {
			if (e.direction == 1) {
				xDegrees -= 180;
			}
			else if (e.direction == -1) {
				xDegrees += 180;
			}
		}
		if (e.orientation == 'vertical') {
			if (e.direction == -1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees -= 180;
				}
				else {
					yDegrees += 180;
				}
			}
			else if (e.direction == 1) {
				if ((Math.abs(xDegrees % 360)) > 0) {
					yDegrees += 180;
				}
				else {
					yDegrees -= 180;
				}
			}
		}
	}
	
	updateCardCSS();
});

// Button click to rotate (on large screens only)
function rotateCard(direction) {
	if (direction == 'clockwise') {
		rDegrees += 90;
	}
	else if (direction == 'counterclockwise') {
		rDegrees -= 90;
	}
	
	updateCardCSS();
}

function updateCardCSS() {
	$('#card').css({
		'-webkit-transform' : 'rotate(' + rDegrees + 'deg) rotateX(' + xDegrees + 'deg) rotateY(' + yDegrees + 'deg)',
		 '-moz-transform' : 'rotate(' + rDegrees + 'deg) rotateX(' + xDegrees + 'deg) rotateY(' + yDegrees + 'deg)',
		  '-ms-transform' : 'rotate(' + rDegrees + 'deg) rotateX(' + xDegrees + 'deg) rotateY(' + yDegrees + 'deg)', 
		   '-o-transform' : 'rotate(' + rDegrees + 'deg) rotateX(' + xDegrees + 'deg) rotateY(' + yDegrees + 'deg)', 
			  'transform' : 'rotate(' + rDegrees + 'deg) rotateX(' + xDegrees + 'deg) rotateY(' + yDegrees + 'deg)',
	});
}

$('#rotate-counterclockwise.rotate-button').on('click', function(e) {
	if (lastTime) {
		timeDiff = event.timeStamp - lastTime;
		if (timeDiff < eventThreshold) {
			return false;
		}
	} 
	lastTime = event.timeStamp;
	
	rotateCard('counterclockwise');
});

$('#rotate-clockwise.rotate-button').on('click', function(e) {
	if (lastTime) {
		timeDiff = event.timeStamp - lastTime;
		if (timeDiff < eventThreshold) {
			return false;
		}
	} 
	lastTime = event.timeStamp;
	
	rotateCard('clockwise');
});