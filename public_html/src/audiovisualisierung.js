/*
 * Audiovisualization using the html canvas element.
 * Please note: this is an offline-only version. For this version to be used online you need an XMLHttpRequest to load the music file!
 * ©2017, Dominik Hofacker
 * https://www.behance.net/dominikhofacker
 * Please consider supporting this project on behance:
 * https://www.behance.net/gallery/49260123/Web-Audio-Visualization
 */

var rafID = null;
var analyser = null;
var c = null;
var cDraw = null;
var ctx = null;
var micropone = null;
var ctxDraw = null;

var loader;
var filename;

//handle different prefix of the audio context
var AudioContext = AudioContext || webkitAudioContext;
//create the context.
var context = new AudioContext();

//using requestAnimationFrame instead of timeout...
if (!window.requestAnimationFrame)
	window.requestAnimationFrame = window.webkitRequestAnimationFrame;

$(function () {

	if (!!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia)) {
		
		//handle different types navigator objects of different browsers
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
	            navigator.mozGetUserMedia || navigator.msGetUserMedia;

	    //eigene Init
	    loader = new BufferLoader();
            //loader.visualize = visualize;

            //init canvas
	    initBinCanvas();	
	} else {
	  alert('getUserMedia() is not supported in your browser');
	}
});

function handleFiles(files) {
    if(files.length === 0){
        return;
    }
    setupAudioNodes();
    loader.load("audio", files[0],function() {

                filename = files[0].name.toString();
                filename = filename.slice(0, -4);
                console.log(filename);
                
                var url = files[0].urn || files[0].name;
                ID3.loadTags(url, function() {
                    var tags = ID3.getAllTags(url);
                    
//                    console.log(tags.title.toString().length);
//                    if (tags.title.length > 14) {
//                        var newTitle = tags.title.substring(0,14);
//                        newTitle += "...";
//                        $("#title").html(newTitle);
//                    }
//                    else {
//                        $("#title").html(tags.title);
//                    }
                    if (tags.title.length > 14) {
                        var finalTitle;
                        var checkTitle = tags.title.toLowerCase();
                        var cutIndex = checkTitle.indexOf("feat.");
                        //console.log(tags.title.toLowerCase());
                        var cutIndex2 = checkTitle.indexOf("(");
                        //console.log(cutIndex2);

                        var enthaeltFeat = cutIndex !== -1;
                        var enthaeltKlammer = cutIndex2 !== -1;
                        
                        //console.log(enthaeltKlammer);

                        if (enthaeltFeat && !enthaeltKlammer) {
                            finalTitle = tags.title.substring(0, cutIndex);
                        }
                        else if (enthaeltKlammer && !enthaeltFeat) {
                            finalTitle = tags.title.substring(0, cutIndex2);
                        }
                        else if (enthaeltFeat && enthaeltKlammer && cutIndex < cutIndex2) {
                            finalTitle = tags.title.substring(0, cutIndex);
                        }
                        else if (enthaeltFeat && enthaeltKlammer && cutIndex2 < cutIndex) {
                            finalTitle = tags.title.substring(0, cutIndex2);
                        }
                        else { //!Klammer !Feat
                            var newTitle = tags.title.substring(0,14);
                            newTitle += "...";
                            finalTitle = newTitle;
                        }
                        
                        $("#title").html(finalTitle);
                    }
                    else {
                        $("#title").html(tags.title);
                    }

                    $("#title").css("visibility", "visible");
                    
                    $("#artist").html(tags.artist);
                    $("#artist").css("visibility", "visible");
                    $("#album").html(tags.album);
                    $("#album").css("visibility", "visible");
                  }, {
                    tags: ["title","artist","album","picture"],
                    dataReader: ID3.FileAPIReader(files[0])
                  });
                
                // decode the data
		context.decodeAudioData(reader.result, function(buffer) {
		// when the audio is decoded play the sound
		sourceNode.buffer = buffer;
		sourceNode.start(0);
		//on error
		}, function(e) {
			console.log(e);
		});

        //loader.play("audio");
        
        $("#freq, body").addClass("animateHue");
    });
}

function initBinCanvas () {

	//add new canvas
	c = document.getElementById("freq");
	c.width = window.innerWidth;
        c.height = window.innerHeight;
	//get context from canvas for drawing
	ctx = c.getContext("2d");
	
	ctx.canvas.width  = window.innerWidth;
  	ctx.canvas.height = window.innerHeight;
	
	window.addEventListener( 'resize', onWindowResize, false );
	
	//create gradient for the bins
	var gradient = ctx.createLinearGradient(0, c.height - 300,0,window.innerHeight - 25);
	gradient.addColorStop(1,'#00f'); //black
	gradient.addColorStop(0.75,'#f00'); //red
	gradient.addColorStop(0.25,'#f00'); //yellow
	gradient.addColorStop(0,'#ffff00'); //white

	
	ctx.fillStyle = "#9c0001";
}

function onWindowResize()
{
	ctx.canvas.width  = window.innerWidth;
  	ctx.canvas.height = window.innerHeight;
}

var audioBuffer;
var sourceNode;
function setupAudioNodes() {
	// setup a analyser
	analyser = context.createAnalyser();
	// create a buffer source node
	sourceNode = context.createBufferSource();	
	//connect source to analyser as link
	sourceNode.connect(analyser);
	// and connect source to destination
	sourceNode.connect(context.destination);
	//start updating
	rafID = window.requestAnimationFrame(updateVisualization);
}


function reset () {
	if (typeof sourceNode !== "undefined") {
		sourceNode.stop(0);		
	}
	if (typeof microphone !== "undefined") {
		microphone = null;
	}
}


function updateVisualization () {
        
	// get the average, bincount is fftsize / 2
	var array = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);

	drawBars(array);
        
       // setTextAnimation(array);
    

	rafID = window.requestAnimationFrame(updateVisualization);
}

function drawBars (array) {

	//just show bins with a value over the treshold
	var threshold = 0;
	// clear the current state
	ctx.clearRect(0, 0, c.width, c.height);
	//the max count of bins for the visualization
	var maxBinCount = array.length;
	//space between bins
	var space = 3;
        
        ctx.save();
        
        
        ctx.globalCompositeOperation='source-over';
        
        //console.log(maxBinCount); //--> 1024
        ctx.scale(0.5, 0.5);
        ctx.translate(window.innerWidth, window.innerHeight);
        ctx.fillStyle = "#fff";
        
        var bass = Math.floor(array[1]); //1Hz Frequenz 
        var radius = -(bass * 0.25 + 450);
        
        
	//go over each bin
	for ( var i = 0; i < maxBinCount; i++ ){

		var value = array[i];
		if (value >= threshold) {				

			//draw bin
			//ctx.fillRect(0 + i * space, c.height - value, 2 , c.height);
                        //ctx.fillRect(i * space, c.height, 2, -value);
                        ctx.fillRect(0, radius, 3, -value);
                        ctx.rotate((180 / 128) * Math.PI/180);
                  
		}
	}   
       
//        for ( var i = 0; i < maxBinCount; i++ ){ //ÜBERFLÜSSIG
//
//		var value = array[i];
//		if (value >= threshold) {				
//
//			//draw bin
//			//ctx.fillRect(0 + i * space, c.height - value, 2 , c.height);
//                        //ctx.fillRect(i * space, c.height, 2, -value);
//                        ctx.rotate(-(180 / 128) * Math.PI/180);
//                        ctx.fillRect(0, radius, 3, -value);
//                        
//                  
//		}
//	} 
        
        for ( var i = 0; i < maxBinCount; i++ ){

		var value = array[i];
		if (value >= threshold) {				

			//draw bin
			//ctx.fillRect(0 + i * space, c.height - value, 2 , c.height);
                        //ctx.fillRect(i * space, c.height, 2, -value);
                        ctx.rotate(-(180 / 128) * Math.PI/180);
                        ctx.fillRect(0, radius, 3, -value);
                        
                  
		}
	} 
        
        for ( var i = 0; i < maxBinCount; i++ ){

		var value = array[i];
		if (value >= threshold) {				

			//draw bin
			//ctx.fillRect(0 + i * space, c.height - value, 2 , c.height);
                        //ctx.fillRect(i * space, c.height, 2, -value);
                        ctx.rotate((180 / 128) * Math.PI/180);
                        ctx.fillRect(0, radius, 3, -value);
                        
                  
		}
	} 
        ctx.restore();
}

//function setTextAnimation(array)
//{
//    var bass = Math.floor(array[1]); //4Hz Frequenz 
//    
//    
//    var fontSize = bass * 0.25 + 50;
//    
//    ctx.save();
//    ctx.globalCompositeOperation='destination-over';
//    ctx.fillStyle = "#fff";
//    ctx.filter = "blur(16px)";
//    
//    var neueFontsize = 70;
//    if (fontSize > neueFontsize) {
//        neueFontsize = fontSize;
//    }
//    
//    //ctx.font = neueFontsize.toString() + "px Arial";
//    if (navigator.userAgent.indexOf("Chrome/53.0.2764.0") > -1) { //besserer Look in Chrome Canary
//        console.log("Chrome Canary User Agent detected");
//        ctx.font="normal normal 300 350px Roboto";
//        if (filename !== undefined) {
//            ctx.fillText(filename, 0, c.height - 200);
//        }
//    }
//    ctx.filter = "blur(0px)";
//    //ctx.font="normal normal 100 " + neueFontsize.toString() + "px Roboto";
//    ctx.font="normal normal 100 70px Roboto";
//    if (filename !== undefined) {
//        ctx.fillText(filename, window.innerWidth / 2 - 125, c.height / 2);
//    }
//    ctx.restore();
//}

$(document).ready(function(){
    //$("#freq").css("margin-top", window.innerHeight - 325);
    $('#title').css('top', c.height / 2 - 25 + 'px');
    $('#artist').css('top', c.height / 2 - 90 + 'px');
    $('#album').css('top', c.height / 2 + 100 + 'px');
    
});

