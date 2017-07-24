//==============================================================================
// Author: Nergal
// Date: 2015-11-17
//==============================================================================
"use strict";

function Game() {
    this.container;
    this.scene;
    this.camera;
    this.renderer;
    this.stats;
    this.clock;
    this.controls;

    // Scene settings
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.viewAngle = 10;
    this.aspect = this.screenWidth/this.screenHeight;
    this.near = 10;
    this.far = 3000;
    this.invMaxFps = 1/60;
    this.frameDelta = 0;

    // Procedurally generated stuff
    this.proc = undefined;
    this.rollOverMesh = undefined;
    this.isShiftDown = 0;
    this.isADown = 0;
    this.raycaster = 0;
    this.mouse = 0;

    // Object arrays
    this.objects = [];
    this.world = undefined;
    this.phys = undefined;

    // Modes
    this.mode = "edit"; // play / edit

    // Should be in player later...
    this.player = undefined;
    this.keyboard = 0;
    this.box = 0;
    this.inputTime = 0;

    //==========================================================
    // InitScene
    //==========================================================
    Game.prototype.initScene = function() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(20, this.aspect, this.near, this.far);
        this.scene.add(this.camera);
    };

    //==========================================================
    // Init other stuff
    //==========================================================
    Game.prototype.Init = function(mapId) {
        this.clock = new THREE.Clock();
        this.stats = new Stats();
        this.stats = new Stats();
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.bottom = '0px';
        this.stats.domElement.style.zIndex = 100;
        $('#container').append( this.stats.domElement );

        this.initScene();

        this.renderer = new THREE.WebGLRenderer( {antialias: true} );
        this.renderer.setSize(this.screenWidth, this.screenHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container = document.getElementById('container');
        this.container.appendChild(this.renderer.domElement);

        this.scene.fog = new THREE.Fog( 0xFF99AA, 100, 3000);
        this.renderer.setClearColor(0xFFA1C1, 1);

        THREEx.WindowResize(this.renderer, this.camera);

       var ambientLight = new THREE.AmbientLight( 0xEEB1C6 );
       this.scene.add( ambientLight );


       var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.2 );
       hemiLight.color.setHSL( 0.6, 1, 0.6 );
       hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
       hemiLight.position.set( 0, 500, 0 );
       game.scene.add( hemiLight );

        var dirLight = new THREE.DirectionalLight( 0x999999, 0.4 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( 23, 23, 10 );
        dirLight.position.multiplyScalar( 10 );
        game.scene.add( dirLight );

        //dirLight.castShadow = false;
        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 512;
        dirLight.shadowMapHeight = 512; // 2048

        var d = 150;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.45; 



        // Voxel paint
        var rollOverGeo = new THREE.BoxGeometry( 1, 1, 1 );
        var rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, opacity: 0.5, transparent: true } );
        this.rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
        this.scene.add( this.rollOverMesh );

        this.world = new World();
        console.log("World init...");
        this.world.Init();


       

        this.phys = new Phys();
        this.phys.Init();

        this.player = new Player();

        this.proc = new Proc();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        $('#editor').append("<br><span id='key1'>1: None</span> | <span id='key2'>2: Block</span> | <span id='key3'>3: Eraser</span> | <span id='key4'>4: Free Draw </span> | <span id='key5'>5: Explode</span><br><br>");

        // Load world
        var vox = new Vox();
        // No weapons
        vox.LoadModel("objects/player_stand.vox", function(t, name, chunk){game.player.standChunk = chunk; game.player.shootChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_jump.vox", function(t, name, chunk){game.player.jumpChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run1.vox", function(t, name, chunk){game.player.run1Chunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run2.vox", function(t, name, chunk){game.player.run2Chunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_fall.vox", function(t, name, chunk){game.player.fallChunk = chunk;}, "Player", TYPE_OBJECT);

        // Rocket launcher
        vox.LoadModel("objects/player_stand_rocket.vox", function(t, name, chunk){game.player.standRocketChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_jump_rocket.vox", function(t, name, chunk){game.player.jumpRocketChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run1_rocket.vox", function(t, name, chunk){game.player.run1RocketChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run2_rocket.vox", function(t, name, chunk){game.player.run2RocketChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_shoot_rocket.vox", function(t, name, chunk){game.player.shootRocketChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_fall_rocket.vox", function(t, name, chunk){game.player.fallRocketChunk = chunk;}, "Player", TYPE_OBJECT);
        
        // Shutgun
        vox.LoadModel("objects/player_stand_shotgun.vox", function(t, name, chunk){game.player.standShotgunChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_jump_shotgun.vox", function(t, name, chunk){game.player.jumpShotgunChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run1_shotgun.vox", function(t, name, chunk){game.player.run1ShotgunChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_run2_shotgun.vox", function(t, name, chunk){game.player.run2ShotgunChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_shoot_shotgun.vox", function(t, name, chunk){game.player.shootShotgunChunk = chunk;}, "Player", TYPE_OBJECT);
        vox.LoadModel("objects/player_fall_shotgun.vox", function(t, name, chunk){game.player.fallShotgunChunk = chunk;}, "Player", TYPE_OBJECT);

        vox.LoadModel("maps/monu9_test2.vox", function(name){game.player.Init("test");}, "Map1", TYPE_MAP);

        this.animate();
    };
    
    Game.prototype.onWindowResize = function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    };

    Game.prototype.getDistance = function(v1, v2) {
        var dx = v1.x - v2.x;
        var dy = v1.y - v2.y;
        var dz = v1.z - v2.z;
        return Math.sqrt(dx*dx+dy*dy+dz*dz);
    };

    //==========================================================
    // Render
    //==========================================================
    Game.prototype.render = function() {
        this.renderer.render(this.scene, this.camera);
    };

    //==========================================================
    // Animate
    //==========================================================
    Game.prototype.animate = function() {
        this.animId = requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.update();
    };

    //==========================================================
    // Update
    //==========================================================
    Game.prototype.update = function() {
        var delta = this.clock.getDelta(),
        time = this.clock.getElapsedTime() * 10;

        this.frameDelta += delta;

        while(this.frameDelta >= this.invMaxFps) {
            this.player.Draw(time,this.invMaxFps);
            this.phys.Draw(time, this.invMaxFps);
            this.frameDelta -= this.invMaxFps;
            this.world.Draw(time,delta);  
            
            // Test waterfall
            if((game.world.blocks[98][67][83] >> 8) != 0) {
                if(Math.random() > 0.5) {
                    var block = game.phys.Get();
                    if(block != undefined) {
                        block.gravity = 1;
                        var r = 15;
                        var g = 169;
                        var b = 189;
                        if(lfsr.rand()>0.5) {
                            r = 36;
                            g = 152;
                            b = 229;
                        }
                        block.Create(86+lfsr.rand()*5,
                                     65,
                                     92,
                                     r, 
                                     g,
                                     b,
                                     -1, 10, PHYS_SMOKE, 1);

                    }
                }
                // Test fountain
                if(Math.random() > 0.7) {
                    var block = game.phys.Get();
                    if(block != undefined) {
                        block.gravity = 1;
                        var r = 15;
                        var g = 169;
                        var b = 189;
                        if(lfsr.rand()>0.5) {
                            r = 255;
                            g = 255;
                            b = 255;
                        }
                        block.Create(85+lfsr.rand()*7,
                                     36,
                                     90+lfsr.rand()*5,
                                     r, 
                                     g,
                                     b,
                                     0.5, 5, PHYS_SMOKE, 1);

                    }
                }
            }

        }	
        this.stats.update();
    };

    Game.prototype.rand = function(min, max, n) {
        var r, n = n||0;
        if (min < 0) r = min + Math.random() * (Math.abs(min)+max);
        else r = min + Math.random() * max;
        return r.toFixed(n)*1;
    };
}
