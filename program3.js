// Hunter Doerr doerr034@umn.edu Copyright 2017 
var canvas;
var gl;
var programId;

var points = [];

//light variables
var lightPosition = vec4(1.0,1.0,1.0,0.0);


//material variables to be updated when a material is selected;
var materialAmbient;
var materialDiffuse;
var materialSpecular;
var materialShininess;

var showEnv = [-5, 0, 0, 0];
//These can be changed to teacup/teaspoon if you're sick of the teapot.
var tPoints = teapotPoints;
var tIndices = teapotIndices;

//Pass the cube map texture into the GPU as uniform "texMap"
function configureCubeMap() {

    var cubeMap = gl.createTexture();

	//Get HTML images
	var imagert = document.getElementById("skyboxrt");
	var imagelf = document.getElementById("skyboxlf");
	var imageup = document.getElementById("skyboxup");
	var imagedn = document.getElementById("skyboxdn");
	var imagefr = document.getElementById("skyboxfr");
	var imagebk = document.getElementById("skyboxbk");
	
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
	  
	//Bind HTML images to texMap
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imagert );
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imagelf );
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imageup );
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imagedn );
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imagefr );
	gl.texImage2D( gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 
         gl.RGBA, gl.UNSIGNED_BYTE, imagebk );

    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.activeTexture( gl.TEXTURE0 );
    gl.uniform1i(gl.getUniformLocation(programId, "texMap"),0); 
}


// Binds "on-change" events for the controls on the web page
function initControlEvents() {
    // Use one event handler for all of the shape controls
    document.getElementById("shape-select").onchange = 
    document.getElementById("superquadric-constant-n1").onchange = 
    document.getElementById("superquadric-constant-n2").onchange = 
    document.getElementById("superquadric-constant-a").onchange =
    document.getElementById("superquadric-constant-b").onchange =
    document.getElementById("superquadric-constant-c").onchange =
        function(e) {
            var shape = document.getElementById("shape-select").value;
            // Regenerate the vertex data
            updateWireframe(surfaces[document.getElementById("shape-select").value],
                getSuperquadricConstants());
        };
       
    // Event handler for the FOV control
    document.getElementById("fov").onchange =
        function(e) {
			var fov = Number(document.getElementById("fov").value);
            updateProjection(perspective(fov,1,.1,20));
    
        };
    document.getElementById("appear-select").onchange =
        function(e) {
        var a = Number(document.getElementById("appear-select").value);
            if(a == "1"){//yellow
                setYellowPlastic();
                showEnv[0] = 10;
            }
            else if(a == "2"){//brass
                showEnv[0] = 10;
                setBrass();
            }
            else if(a == "3"){//enviornment map
                showEnv[0] = -5;
                configureCubeMap();
            }
            updateProjection(perspective(fov,1,.1,20));
     };    
		
	
}

// Function for querying the current superquadric constants: a, b, c, d, n1, n2
function getSuperquadricConstants() {
    return {
        a: parseFloat(document.getElementById("superquadric-constant-a").value),
        b: parseFloat(document.getElementById("superquadric-constant-b").value),
        c: parseFloat(document.getElementById("superquadric-constant-c").value),
        n1: parseFloat(document.getElementById("superquadric-constant-n1").value),
        n2: parseFloat(document.getElementById("superquadric-constant-n2").value)
    }
}

// Function for querying the current field of view
function getFOV() {
    return parseFloat(document.getElementById("fov").value);
}



// The current translation matrix
var transMatrix;
var transLightMatrix;
// Current rotation matrix
var rotationMatrix;
var rotationLightMatrix;
// The OpenGL ID of the vertex buffer containing the current shape
var wireframeBufferId;
// The number of vertices in the current vertex buffer
var wireframePointCount;
// Sets up keyboard and mouse events
function initWindowEvents() {
    // Affects how much the camera moves when the mouse is dragged.
    var sensitivity = 1;

    // Additional rotation caused by an active drag.
    var newRotationMatrix;
    var newLightRotationMatrix;
	
    // Whether or not the mouse button is currently being held down for a drag.
    var mousePressed = false;
    var shiftPressed = false;
    
    // The place where a mouse drag was started.
    var startX, startY;
	var currX,currY;
    
    var speed = 0.1; // Affects how fast the camera pans and "zooms"
    

	canvas.onmousedown = function(e) {
        // A mouse drag started.
        mousePressed = true;
        
        // Remember where the mouse drag started.
        startX = e.clientX;
        startY = e.clientY;
    }
	
    canvas.onmousemove = function(e) {
		currX = e.clientX;
		currY = e.clientY;
        if (mousePressed && shiftPressed) {//moving light source
            // Handle a mouse drag by constructing an axis-angle rotation matrix
            var axis = vec3(e.clientY - startY, e.clientX - startX, 0.0);
            var angle = length(axis) * sensitivity;
            if (angle > 0.0) {
                angle = -1*angle;
					newLightRotationMatrix = mult(rotate(angle, axis), rotationLightMatrix);
					updateLightModelView(newLightRotationMatrix);
				
            }
        }
        else if (mousePressed) {
            // Handle a mouse drag by constructing an axis-angle rotation matrix
            var axis = vec3(e.clientY - startY, e.clientX - startX, 0.0);
            var angle = length(axis) * sensitivity;
            if (angle > 0.0) {
					newRotationMatrix = mult(rotate(angle, axis), rotationMatrix);
					updateModelView(transMatrix,newRotationMatrix);
				
            }
        }
    }
	
	window.onmouseup = function(e) {
        // A mouse drag ended.
        mousePressed = false;
        
        if (newRotationMatrix) {
				rotationMatrix = newRotationMatrix;
        }
        newRotationMatrix = null;
    }

	window.onkeyup = function(e){
        if (e.keyCode === 16) { // shift up
        shiftPressed = false;
        }
    }

	window.onkeydown = function(e) {
        if (e.keyCode === 190) { // '>' key
            // "Zoom" in
            transMatrix = mult(translate(0,0,speed), transMatrix);

        }
        else if (e.keyCode === 188) { // '<' key
            // "Zoom" out
            transMatrix = mult(translate(0,0,-speed), transMatrix);
        }
        else if (e.keyCode === 37) { // Left key
            // Pan left
            transMatrix = mult(translate(speed,0,0), transMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault(); 
        }
        else if (e.keyCode === 38) { // Up key
            // Pan up
            transMatrix = mult(translate(0,-speed,0), transMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 39) { // Right key
            // Pan right
            transMatrix = mult(translate(-speed,0,0), transMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 40) { // Down key
            // Pan down 
            transMatrix = mult(translate(0,speed,0), transMatrix);
            
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if(e.keyCode == 16){//shift pressed
            shiftPressed = true;
        }
        updateModelView(transMatrix,rotationMatrix);
    }

}


//Mb from the lecture slides
var mBez = mat4([-1,3,-3,1,3,-6,3,0,-3,3,0,0,1,0,0,0]);

//Access the teapot data set points to get a Px/Py/Pz data for a given patch
function getPMatrix(patchInd,xyz){
	var arr = mat4();
	for(var j=0;j<4;j++){
		for(var k=0;k<4;k++){
			arr[j][k] = tPoints[tIndices[patchInd][j][k]][xyz];
		}
	}
	return arr;
}

// Define the two possible surfaces
// evaluate: function that takes in superquadric constants (ignored if teapot), u and v values,
//     and which bezier patch to evaluate (ignored if superquadric).  Returns position vec3.
// uMin, uMax, uSteps, vMin, vMax, vSteps: parametric bounds and number of steps per dimension
// patches: number of parametric surfaces to draw (1 for superquadric)
var surfaces = {
    superellipsoid: {
        evaluate: function(constants, u, v, patchInd) {
            var cosU = Math.cos(u);
            var sinU = Math.sin(u);
            var cosV = Math.cos(v);
            var sinV = Math.sin(v);
            return vec3(
                constants.a *-1* Math.sign(cosV * cosU) * Math.pow(Math.abs(cosV), 2 / constants.n1) * 
                    Math.pow(Math.abs(cosU), 2 / constants.n2),
                constants.b * Math.sign(cosV * sinU) * Math.pow(Math.abs(cosV), 2 / constants.n1) * 
                    Math.pow(Math.abs(sinU), 2/constants.n2),
                constants.c * Math.sign(sinV) * Math.pow(Math.abs(sinV), 2 / constants.n1)
            );
        },
        uMin: -Math.PI,
        uMax: Math.PI,
		uSteps: 50,
        vMin: -Math.PI / 2,
        vMax: Math.PI / 2,
		vSteps: 50,
		patches: 1
    },
	teapot: {
        evaluate: function(constants, u, v, patchInd) {
			var uVec = vec4(u*u*u,u*u,u,1);
			var vVec = vec4(v*v*v,v*v,v,1);
			var uBez = mult(uVec,mBez);
			var vBez = mult(mBez,vVec);
			var xVal = dot(mult(uBez,getPMatrix(patchInd,0)),vBez);
			var yVal = dot(mult(uBez,getPMatrix(patchInd,1)),vBez);
			var zVal = dot(mult(uBez,getPMatrix(patchInd,2)),vBez);
			return vec3(xVal,yVal,zVal);
        },
        uMin: 0,
        uMax: 1,
		uSteps: 25,
        vMin: 0,
        vMax: 1,
		vSteps: 25,
		patches: tIndices.length
    }
}


var normals;
// Regenerates the vertex data.
// Only needs to be called when the intrinsic properties (n1, n2, a, b, c, d) of the superquadric change,
// or we switch from superquadric to bezier surface
function updateWireframe(surface, constants) {
    // Initialize an empty array of points
    points = [];
	normals = [];
    // Determine how much u and v change with each segment
    var du = (surface.uMax-surface.uMin) / surface.uSteps;
    var dv = (surface.vMax-surface.vMin) / surface.vSteps;
    
    // Reset the vertex count to 0
    wireframePointCount = 0;
    
    // Loop over u and v, generating all the required line segments
	for (var pat = 0; pat < surface.patches; pat++){
		for (var i = 0; i < surface.uSteps; i++) {
			for (var j = 0; j < surface.vSteps; j++) {
				
				
				// Determine u and v
				var u = surface.uMin + i * du;
				var v = surface.vMin + j * dv;
			
				// p is the "current" point at surface coordinates (u,v)
				var p = surface.evaluate(constants, u, v, pat);
				
				// pu is the point at surface coordinates (u+du, v)
				var pu = surface.evaluate(constants, u + du, v, pat);
				
				// pv is the point at surface coordinates (u, v+dv)
                var pv = surface.evaluate(constants, u, v + dv, pat);
                
                //
                var x = surface.evaluate(constants, u+du,v+dv,pat);

				// Add a line segment between p and pu
				points.push(p);
                points.push(pu);
                points.push(pv);
                var n = cross(subtract(pv,p),subtract(pu,p));
                n = normalize(n);
                normals.push(n);
                normals.push(n);
                normals.push(n);
				wireframePointCount += 3;
               
				// Add a line segment between p and pv
				points.push(x);
                points.push(pv);
                points.push(pu);
                var n = cross(subtract(pu,x),subtract(pv,x));
                n = normalize(n);
                normals.push(n);
                normals.push(n);
                normals.push(n);
				wireframePointCount += 3;

				v += dv;
			}
			v = surface.vMin;
			
		  
			u += du;
		}
	}
    
    // Pass the new set of vertices to the graphics card
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.DYNAMIC_DRAW);
    
    var vPosition = gl.getAttribLocation( programId, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    //normal buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.DYNAMIC_DRAW);
    
    var vPosition = gl.getAttribLocation( programId, "vNormal");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
}

// The locations of the required GLSL uniform variables.
var locations = {};

// Looks up the locations of uniform variables once.
function findShaderVariables() {
    locations.modelView = gl.getUniformLocation(programId, "modelView");
    locations.projection = gl.getUniformLocation(programId, "projection");
}

// Pass an updated model-view matrix to the graphics card.
function updateModelView(transCamera,rotaCamera) {
	var eye = vec3(mult(mult(transCamera,vec4(0,0,5,1)),rotaCamera));
	var up = vec3(mult(vec4(0,1,0,0),rotaCamera));
	var at = vec3(mult(mult(transCamera,vec4(0,0,0,1)),rotaCamera));
	modelView = lookAt(eye,at,up);
    gl.uniformMatrix4fv(locations.modelView, false, flatten(modelView));

}

function updateLightModelView(rotaLight) {
    lightPosition = vec4(mult(vec4(1,1,1,1),rotaLight));
};

// Pass an updated projection matrix to the graphics card.
function updateProjection(projection) {
    gl.uniform4fv(gl.getUniformLocation(programId, "env"),flatten(showEnv));

    gl.uniform4fv(gl.getUniformLocation(programId, "ambientProduct"),
    flatten(materialAmbient));
    gl.uniform4fv(gl.getUniformLocation(programId, "diffuseProduct"),
    flatten(materialDiffuse) );
    gl.uniform4fv(gl.getUniformLocation(programId, "specularProduct"), 
    flatten(materialSpecular) );	
    gl.uniform4fv(gl.getUniformLocation(programId, "lightPosition"), 
    flatten(lightPosition) );
    gl.uniformMatrix4fv(locations.projection, false, flatten(projection));
}

window.onload = function() {
	
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
    
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
	
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
	
    gl.enable(gl.DEPTH_TEST);
    // Load shaders
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
    
    // Set up events for the HTML controls
    initControlEvents();

    // Setup mouse and keyboard input
    initWindowEvents();
    
    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
	
	// Black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
	
    // Load the initial data into the GPU
    wireframeBufferId = gl.createBuffer();
    updateWireframe(surfaces.superellipsoid, getSuperquadricConstants());
    //
    //
	configureCubeMap();
    gl.activeTexture( gl.TEXTURE0 );////////////////////////////////////////////////////
    updateWireframe(surfaces.superellipsoid, getSuperquadricConstants());
    //
    //
	configureCubeMap();
    // Initialize the view, projection, and rotation matrices
    findShaderVariables();
    transMatrix = mat4(1);
    rotationMatrix = mat4(1);
    rotationLightMatrix = mat4(1);
    updateModelView(transMatrix,rotationMatrix);
    updateLightModelView(rotationLightMatrix);
	fov = getFOV();
    
    setYellowPlastic();
	//Let's just avoid clipping issues until you implement perspective
	//by making the near and far planes really far away.
	updateProjection(perspective(fov,1,.1,20));


	//Begin rendering loop
    window.setInterval(render, 33);
};

// Render the scene
function render() {
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4fv(gl.getUniformLocation(programId, "lightPosition"), 
    flatten(lightPosition) );
    // Draw the wireframe using gl.LINES
    gl.drawArrays(gl.TRIANGLES, 0, wireframePointCount);
};


function setYellowPlastic(){
    materialAmbient = vec4( .1, 0.1, 0.1, 1.0 );
    materialDiffuse = vec4( 1.1, 1.1, 0.08, 1.0);
    materialSpecular = vec4( .1, 0.1, 0.1, 1.0 );
    materialShininess = 50.0;
}


function setBrass(){
    materialAmbient = vec4( .11, 0.11, 0.11, 1.0 );
    materialDiffuse = vec4( .95, .75, .25, 1.0);
    materialSpecular = vec4( .22, 0.22, 0.22, 1.0 );
    materialShininess = 10.0;
}