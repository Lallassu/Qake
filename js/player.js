const WEAPON_ROCKET = 0;
const WEAPON_SHOTGUN = 1;
const WEAPON_NONE = 2;

const MAX_HP = 100;

const MODEL_STAND = 0;
const MODEL_JUMP  = 1;
const MODEL_RUN1 = 2;
const MODEL_RUN2 = 3;
const MODEL_SHOOT = 4;
const MODEL_FALL = 5;
const MOVE_FORWARD = 0;
const MOVE_BACKWARD = 1;
const MOVE_LEFT = 2;
const MOVE_RIGHT = 3;
const MOVE_UP = 4;
const MOVE_DOWN = 5;

function Player () {
    this.name = "John Doe";
    this.hp = 0;
    this.weapon = WEAPON_ROCKET;
    this.rotateAngle = 0;
    this.moveDistance = 0;
    // TBD: Make array of these with constants for lookup
    this.run1Chunk = undefined;
    this.run2Chunk = undefined;
    this.run1RocketChunk = undefined;
    this.run2RocketChunk = undefined;
    this.run1ShotgunChunk = undefined;
    this.run2ShotgunChunk = undefined;
    this.jumpChunk = undefined;
    this.jumpRocketChunk = undefined;
    this.jumpShotgunChunk = undefined;
    this.standChunk = undefined;
    this.standRocketChunk = undefined;
    this.standShotgunChunk = undefined;
    this.fallChunk = undefined;
    this.fallRocketChunk = undefined;
    this.fallShotgunChunk = undefined;
    this.shootChunk = undefined;
    this.shootRocketChunk = undefined;
    this.shootShotgunChunk = undefined;
    
    this.mesh = undefined;
    this.chunk = undefined;
    this.currentModel = MODEL_STAND;
    this.runTime = 0;
    this.jumpTime = 0;
    this.cameraAttached = false;
    this.camera = new THREE.Object3D();
    this.mass = 4;
    this.area = 1;
    this.vy = 1;
    this.avg_ay = 1;
    this.gravity = 9.82;
    this.airDensity = 1.2;
    this.jumping = false;
    this.sampleObjectsTime = 0;
    this.keyboard = new THREEx.KeyboardState();
    this.shooting = false;

    // Camera
    this.attachedCamera = false;
    this.cameraObj = undefined;

    // CD props
    this.canWalkLeft = true;
    this.canWalkRight = true;
    this.canWalkForward = true;
    this.canWalkBackward = true;
    this.canJump = true;
    this.canFall = true;

    Player.prototype.Init = function(name) {
        this.AddBindings();
        this.name = name;
        this.hp = MAX_HP;

//        var chunks = [this.standChunk, this.run1Chunk, this.run2Chunk, this.jumpChunk, this.fallChunk, this.shootChunk];
        var chunks = [
            this.run1Chunk,
            this.run2Chunk,
            this.run1RocketChunk,
            this.run2RocketChunk, 
            this.run1ShotgunChunk,
            this.run2ShotgunChunk,
            this.jumpChunk,
            this.jumpRocketChunk,
            this.jumpShotgunChunk,
            this.standChunk,
            this.standRocketChunk,
            this.standShotgunChunk, 
            this.fallChunk,
            this.fallRocketChunk,
            this.fallShotgunChunk,
            this.shootChunk,
            this.shootRocketChunk,
            this.shootShotgunChunk
        ]; 
        for(var i = 0; i < chunks.length; i++) {
            var mesh = chunks[i].mesh;
            mesh.position.set(0,0,0);
            mesh.rotation.set(0,0,0);
            mesh.geometry.center();
            mesh.geometry.verticesNeedUpdate = true;
        }
        this.SwitchModel(MODEL_STAND);
        this.mesh.position.set(153,21, 55);

        this.cameraObj = new THREE.Object3D();
        this.cameraObj.add(game.camera);
        
        this.attachedCamera = true;
        game.camera.position.set(0, 400, 0);
        game.camera.lookAt(this.cameraObj);
        game.camera.rotation.set(-1.57, 0, 0),
        game.camera.quaternion.set(-0.7, 0, 0, 0.7);
        this.cameraObj.rotation.set(Math.PI/1.5, 0, -Math.PI);
        this.weapon = WEAPON_SHOTGUN;

    };

    Player.prototype.SwitchModel = function(model) {
        if(this.shooting) {
            return;
        }
        if(this.currentModel == model && this.mesh != undefined) {
            return;
        }

        var pos, rot;
        if(this.mesh != undefined) {
            this.mesh.remove(this.cameraObj);
            this.mesh.visible = false;
            pos = this.mesh.position;
            rot = this.mesh.rotation;
        } else {
            pos = new THREE.Vector3(0,0,0);
            rot = new THREE.Vector3(0,0,0);
        }

        switch(model) { 
            case MODEL_JUMP:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.jumpShotgunChunk.mesh;
                    this.chunk = this.jumpShotgunChunk;
                    break;
                case WEAPON_ROCKET:
                    this.mesh = this.jumpRocketChunk.mesh;
                    this.chunk = this.jumpRocketChunk;
                    break;
                case WEAPON_NONE:
                    this.mesh = this.jumpChunk.mesh;
                    this.chunk = this.jumpChunk;
                break;
            }
            break;
            case MODEL_STAND:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.standShotgunChunk.mesh;
                    this.chunk = this.standShotgunChunk;
                break;
                case WEAPON_ROCKET:
                    this.mesh = this.standRocketChunk.mesh;
                    this.chunk = this.standRocketChunk;
                break;
                case WEAPON_NONE:
                    this.mesh = this.standChunk.mesh;
                    this.chunk = this.standChunk;
                break;
            }
            break;
            case MODEL_RUN1:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.run1ShotgunChunk.mesh;
                    this.chunk = this.run1ShotgunChunk;
                break;
                case WEAPON_ROCKET:
                    this.mesh = this.run1RocketChunk.mesh;
                    this.chunk = this.run1RocketChunk;
                break;
                case WEAPON_NONE:
                    this.mesh = this.run1Chunk.mesh;
                    this.chunk = this.run1Chunk;
                break;
            }
            break;
            case MODEL_RUN2:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.run2ShotgunChunk.mesh;
                    this.chunk = this.run2ShotgunChunk;
                break;
                case WEAPON_ROCKET:
                    this.mesh = this.run2RocketChunk.mesh;
                    this.chunk = this.run2RocketChunk;
                break;
                case WEAPON_NONE:
                this.mesh = this.run2Chunk.mesh;
                this.chunk = this.run2Chunk;
                break;
            }
            break;
            case MODEL_SHOOT:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.shootShotgunChunk.mesh;
                this.chunk = this.shootShotgunChunk;
                break;
                case WEAPON_ROCKET:
                    this.mesh = this.shootRocketChunk.mesh;
                this.chunk = this.shootRocketChunk;
                break;
                case WEAPON_NONE:
                    this.mesh = this.shootChunk.mesh;
                this.chunk = this.shootChunk;
                break;
            }
            break;
            case MODEL_FALL:
                switch(this.weapon) {
                case WEAPON_SHOTGUN:
                    this.mesh = this.fallShotgunChunk.mesh;
                this.chunk = this.fallShotgunChunk;
                break;
                case WEAPON_ROCKET:
                    this.mesh = this.fallRocketChunk.mesh;
                this.chunk = this.fallRocketChunk;
                break;
                case WEAPON_NONE:
                    this.mesh = this.fallChunk.mesh;
                this.chunk = this.fallChunk;
                break;
            }
            break;
            default:
                this.mesh = this.standChunk.mesh;
                this.chunk = this.standChunk;
        }
        this.mesh.position.set(pos.x, pos.y, pos.z);
        this.mesh.rotation.set(rot.x, rot.y, rot.z);
        this.currentModel = model;
        this.mesh.updateMatrixWorld();
        this.mesh.add(this.cameraObj);
        this.mesh.visible = true;
    };

    Player.prototype.AddBindings = function() {
        $(document).mouseup(this.OnMouseUp.bind(this));
	    $(document).mousemove(this.OnMouseMove.bind(this));
	    $(document).mousedown(this.OnMouseDown.bind(this));
//	    $(document).keydown(this.KeyDown.bind(this));
    };

    
    Player.prototype.RemoveBindings = function() {
        $(document).unbind('mouseup');
	    $(document).unbind('mousemove');
        $(document).unbind('mousedown');
    };

    Player.prototype.OnMouseMove = function(jevent) {
        var event = jevent.originalEvent; 
        var movementX = event.movementX || event.mozMovementX  ||0;
        var movementZ = event.movementZ || event.mozMovementZ  || 0;
        var x = movementX*0.001;
        var z = movementZ*0.001;

        if(this.mesh != undefined) {
            var axis = new THREE.Vector3(0,1,0);
            var rotObjectMatrix = new THREE.Matrix4();
            rotObjectMatrix.makeRotationAxis(axis.normalize(), -(Math.PI/2)*x);
            this.mesh.matrix.multiply(rotObjectMatrix);
            this.mesh.rotation.setFromRotationMatrix(this.mesh.matrix);
        }
    };

    Player.prototype.OnMouseDown = function(event) {
        if(this.dead) {
            return;
        }
        var mouseButton = event.keyCode || event.which;
        if(mouseButton != 1) {
            return;
        }
        this.SwitchModel(MODEL_SHOOT);
        this.shooting = true;
    };

    Player.prototype.OnMouseUp = function(event) {
        if(this.dead) {
            return;
        }
        var mouseButton = event.keyCode || event.which;
        if(mouseButton == 1) {
            switch(this.weapon) {
                case WEAPON_ROCKET:
                    this.CreateMissile();
                    break;
                case WEAPON_SHOTGUN:
                    this.CreateShot();
                    break;
            }
            this.shooting = false;
        } else if(mouseButton == 3) {
            this.CreateGrenade();
        }
    };

    Player.prototype.CreateGrenade = function() {
        var block = game.phys.Get();

        var pos = new THREE.Vector3(3,2,5);
        var gpos = pos.applyMatrix4(this.mesh.matrix);
                                                          
        if(block != undefined) {
            block.Create(gpos.x,
                         gpos.y,
                         gpos.z,
                         0, // R 
                         66, // G
                         0, // B
                         5, // force 
                         4, // life,
                         PHYS_GRENADE,
                         1000, // bounces
                         0.1 // mass
                        );
           block.mesh.scale.set(1.5,1.5,1.5);
        }


    };

    Player.prototype.CreateShot = function() {

        var pos1 = new THREE.Vector3(3,0,3);
        var gpos1 = pos1.applyMatrix4(this.mesh.matrix);

        var pos2 = new THREE.Vector3(-3,0,3);
        var gpos2 = pos2.applyMatrix4(this.mesh.matrix);

        for(var i = 0; i < 10; i++) {
            var smoke = game.phys.Get();
            var color = 150+lfsr.rand()*105 | 0;
            if(smoke != undefined) {
                smoke.gravity = -1;
                smoke.Create(gpos1.x,
                             gpos1.y+1,
                             gpos1.z,
                             color,
                             color,
                             color,
                             lfsr.rand()*1, 1, PHYS_SMOKE);

            }
            var smoke2 = game.phys.Get();
            var color = 150+lfsr.rand()*105 | 0;
            if(smoke2 != undefined) {
                smoke2.gravity = -1;
                smoke2.Create(gpos2.x,
                              gpos2.y+1,
                              gpos2.z,
                              color,
                              color,
                              color,
                              lfsr.rand()*1, 1, PHYS_SMOKE);

            }
        }
        for(var i = 0; i < 10; i++) {
            var block2 = game.phys.Get();
            if(block2 != undefined) {
                block2.Create(gpos1.x+(2-lfsr.rand()*4),
                             gpos1.y+(2-lfsr.rand()*4),
                             gpos1.z+(2-lfsr.rand()*4),
                             0, // R 
                             0, // G
                             0, // B
                             20, // force 
                             0.5, // life,
                             PHYS_SHOT,
                             1 // bounces
                             );
                block2.mesh.scale.set(0.5,0.5,0.5);
            }
            var block = game.phys.Get();
            if(block!= undefined) {
                block.Create(gpos2.x+(2-lfsr.rand()*4),
                             gpos2.y+(2-lfsr.rand()*4),
                             gpos2.z+(2-lfsr.rand()*4),
                             0, // R 
                             0, // G
                             0, // B
                             20, // force 
                             0.5, // life,
                             PHYS_SHOT,
                             1 // bounces
                            );
                block.mesh.scale.set(0.5,0.5,0.5);
            }
        }
    };

    Player.prototype.CreateMissile = function() {
        var block = game.phys.Get();

        var pos = new THREE.Vector3(3,2,5);
        var gpos = pos.applyMatrix4(this.mesh.matrix);
                                                          
        if(block != undefined) {
            for(var i = 0; i < 20; i++) {
                var smoke = game.phys.Get();
                var color = 150+lfsr.rand()*105 | 0;
                if(smoke != undefined) {
                    smoke.gravity = -1;
                    smoke.Create(gpos.x,
                                 gpos.y+1,
                                 gpos.z,
                                 color,
                                 color,
                                 color,
                                 lfsr.rand()*1, 1, PHYS_SMOKE);

                }
            }
            block.Create(gpos.x,
                         gpos.y,
                         gpos.z,
                         0xff, // R 
                         0x8c, // G
                         0, // B
                         20, // force 
                         1, // life,
                         PHYS_MISSILE,
                         1 // bounces
                        );
        }
    };

    // TBD: Might only have one weapon?
    Player.prototype.ChangeWeapon = function(weapon_id) {
        this.weapon = weapon_id;
    };

    Player.prototype.CanMove = function(type) {
        //this.mesh.updateMatrixWorld();
        for (var i = 0; i < this.chunk.blockList.length; i+=2) {
            var b = this.chunk.blockList[i];

            if(type == MOVE_FORWARD && b.z < 11) {
                continue;
            } else if(type == MOVE_BACKWARD && b.z > 7) {
                continue;
            } else if(type == MOVE_LEFT && b.x < 10) {
                continue;
            } else if(type == MOVE_RIGHT && b.x > 5) {
                continue;
            } else if(type == MOVE_UP && (b.x < 6  || b.x > 7 || b.z > 9 )) {
                continue;
            } else if(type == MOVE_DOWN && b.y-3 > 2) {
                continue;
            }
            var lvector = new THREE.Vector3(b.x-7,b.y-10,b.z-10);
            var vector = lvector.applyMatrix4( this.mesh.matrix );
            var xi = vector.x| 0;
            var yi = vector.y| 0;
            var zi = vector.z| 0;
            xi+=7;
            zi+=10;

            // Keep head down
            if(type == MOVE_UP) {
                yi+=2; 
            }

            if(game.world.IsWithinWorld(xi,yi,zi)) {
                if((game.world.blocks[xi][yi][zi] >> 8) != 0) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return true;
    };

    Player.prototype.KeyDown = function() {
        if(this.keyboard.pressed("1")) {
            this.weapon = WEAPON_ROCKET;
        }
        if(this.keyboard.pressed("2")) {
            this.weapon = WEAPON_SHOTGUN;
        }
        if(this.keyboard.pressed("3")) {
            this.weapon = WEAPON_NONE;
        }
        if(this.keyboard.pressed("K")) {
            this.Die();
        }
        if(this.keyboard.pressed("n")) {
            this.mesh.position.x+=5;
        }
        if(this.keyboard.pressed("m")) {
            this.mesh.position.x-=5;
        }
        if(this.keyboard.pressed("p")) {
            console.log(this.mesh.position);
        }

        if(this.keyboard.pressed("W") && this.canWalkForward) {
            this.mesh.translateZ( this.moveDistance );
            
            if(!this.CanMove(MOVE_FORWARD)) {
                this.mesh.translateZ(-this.moveDistance);
            }

            this.Run();
        }
        if(this.keyboard.pressed("S") && this.canWalkBackward) {
            this.mesh.translateZ( -this.moveDistance );

            if(!this.CanMove(MOVE_BACKWARD)) {
                this.mesh.translateZ(this.moveDistance);
            }
            this.Run();
        }
        if(this.keyboard.pressed("A") && this.canWalkLeft) {
            this.mesh.translateX( this.moveDistance );

            if(!this.CanMove(MOVE_LEFT)) {
                this.mesh.translateX(-this.moveDistance);
            }
            this.Run();
        }
        if(this.keyboard.pressed("D") && this.canWalkRight) {
            this.mesh.translateX( -this.moveDistance );

            if(!this.CanMove(MOVE_RIGHT)) {
                this.mesh.translateX(this.moveDistance);
            }
            this.Run();
        }
        if(this.keyboard.pressed("space")) {
            this.jumpTime = 0;
            this.mesh.translateY( this.moveDistance );
            var x = Math.round(this.mesh.position.x+6);
            var y = Math.round(this.mesh.position.y+3);
            var z = Math.round(this.mesh.position.z+6);
            if(!this.CanMove(MOVE_UP)) {
                this.mesh.translateY(-this.moveDistance);
            }
            this.SwitchModel(MODEL_JUMP);
            this.jumping = true;
            this.canFall = true;
            var pos1 = new THREE.Vector3(-1,-3,-3);
            var gpos1 = pos1.applyMatrix4(this.mesh.matrix);
            var pos2 = new THREE.Vector3(1,-3,-3);
            var gpos2 = pos2.applyMatrix4(this.mesh.matrix);
            for(var i = 0; i < 5; i++) {
                var smoke1 = game.phys.Get();
                var smoke2 = game.phys.Get();
                if(smoke1 != undefined) {
                    smoke1.gravity = -1;
                    smoke1.Create(gpos1.x,
                                  gpos1.y+1,
                                  gpos1.z,
                                  255,
                                  255,
                                  255,
                                  -lfsr.rand()*10, 0.2, PHYS_SMOKE);
                }
                if(smoke2 != undefined) {
                    smoke2.gravity = -1;
                    smoke2.Create(gpos2.x,
                                  gpos2.y+1,
                                  gpos2.z,
                                  255,
                                  255,
                                  255,
                                  -lfsr.rand()*10, 0.2, PHYS_SMOKE);
                }
            }
        }
    };

    Player.prototype.KeyUp = function() {
        if(this.keyboard.pressed("space")) {
           // this.jumping = false;
        }
    };

    Player.prototype.Run = function() {
        if(this.runTime > 0.2) {
            if(this.currentModel == MODEL_RUN2) {
                this.SwitchModel(MODEL_RUN1);
            } else {
                this.SwitchModel(MODEL_RUN2);
            }
            this.runTime = 0;
        }
    };

    Player.prototype.Draw = function(time, delta) {
        if(this.mesh == undefined) {
            return;
        }
        this.KeyDown();
        this.KeyUp();

        // Smoke when falling
        if(this.currentModel == MODEL_FALL) {
            if(lfsr.rand() > 0.8) {
                var pos1 = new THREE.Vector3(-1,-2,-4);
                var gpos1 = pos1.applyMatrix4(this.mesh.matrix);
                var smoke1 = game.phys.Get();
                if(smoke1 != undefined) {
                    smoke1.gravity = -1;
                    smoke1.Create(gpos1.x,
                                  gpos1.y+1,
                                  gpos1.z,
                                  255,
                                  255,
                                  255,
                                  -lfsr.rand()*10, 0.2, PHYS_SMOKE);
                }
            }

            if(lfsr.rand() > 0.8) {
                var smoke2 = game.phys.Get();
                var pos2 = new THREE.Vector3(1,-2,-4);
                var gpos2 = pos2.applyMatrix4(this.mesh.matrix);
                if(smoke2 != undefined) {
                    smoke2.gravity = -1;
                    smoke2.Create(gpos2.x,
                                  gpos2.y+1,
                                  gpos2.z,
                                  255,
                                  255,
                                  255,
                                  -lfsr.rand()*10, 0.2, PHYS_SMOKE);
                }
            }
        }

        this.rotateAngle = (Math.PI / 1.5) * delta ;
        this.moveDistance = 70 * delta;
        this.runTime += delta;
        this.jumpTime += delta;

        if(this.runTime > 0.25 && this.currentModel != MODEL_JUMP && this.currentModel != MODEL_FALL) {
            this.SwitchModel(MODEL_STAND);
        }
        if(this.jumpTime > 0.1) {
            this.jumping = false;
        }
        var x = Math.round(this.mesh.position.x+6+2);
        var y = Math.round(this.mesh.position.y-7);
        var z = Math.round(this.mesh.position.z+6+2);

        for(var x1 = x; x1 < x+4; x1++) {
            for(var z1 = z; z1 < z+4; z1++) {
                if(game.world.IsWithinWorld(x1,y,z1)) {
                    if(game.world.blocks[x1][y][z1] == 0) {
                        this.canFall = true;
                    }
                }
            }
        }


        if(this.mesh != undefined && this.jumping != true && this.canFall) {
            //this.SwitchModel(MODEL_FALL);
            var fy = this.mass*this.gravity;
            fy += -1 * 0.5 * this.airDensity * this.area * this.vy * this.vy;
            var dy = this.vy * delta + (0.5 * this.avg_ay * delta * delta);

            //var wy = Math.floor(y+(dy));
            this.mesh.translateY(-dy*100);
            var new_ay = fy / this.mass;
            this.avg_ay = 0.5 * (new_ay + this.avg_ay);
            for(var x1 = x; x1 < x+4; x1++) {
                for(var z1 = z; z1 < z+4; z1++) {
                    if(game.world.IsWithinWorld(x1,y,z1)) {
                        if(game.world.blocks[x1][y][z1] != 0) {
                            if(this.currentModel == MODEL_FALL) {
                                this.SwitchModel(MODEL_STAND);
                            }
                            this.mesh.translateY(dy*100);
                            this.canFall = false;
                            return;
                        }
                    } else {
                        this.canFall = false;
                        this.SwitchModel(MODEL_STAND);
                        this.vy -= this.avg_ay * delta;
                        return;
                    }
                }
            }
            this.SwitchModel(MODEL_FALL);
        } else {
            if(this.currentModel == MODEL_FALL) {
                this.SwitchModel(MODEL_STAND);
            }
        }

    };

    Player.prototype.Die = function() {
        // Explode player.
        console.log("Player died.");
        for (var i = 0; i < this.chunk.blockList.length; i+=3) {
            var bl = this.chunk.blockList[i];
            var lvector = new THREE.Vector3(bl.x-7,bl.y-10,bl.z-10);
            var vector = lvector.applyMatrix4( this.mesh.matrix );
            var xi = vector.x| 0;
            var yi = vector.y| 0;
            var zi = vector.z| 0;
            xi+=7;
            zi+=10;
            var block = game.phys.Get();
            if(block != undefined) {
                r = bl.color[0];
                g = bl.color[1];
                b = bl.color[2];
                block.Create(vector.x, 
                             vector.y, 
                             vector.z, 
                             r,
                             g,
                             b,
                             lfsr.rand()*5, 3, PHYS_DIE);
            }
        }
        this.mesh.visible=false;

    };

    Player.prototype.Spawn = function(x,y,z) {
        // Box of blocks -> remove all but the ones in mesh.

    };
}
