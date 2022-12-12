class Car{
    constructor(x, y, w, h, controlType, maxVelocity){
        // (x, y) is the centre of the car
        // w and h are its width and height
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.velocity=0;
        this.acceleration=0.2;
        this.maxVelocity = maxVelocity;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;
        this.useBrain = controlType==="AI";

        if (controlType!=="TRAFFIC"){
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(
                [this.sensor.rayCount, 6, 4]
            );
        }
        this.controls = new Controls(controlType);
    }

    update(roadBorders, traffic){
        if (!this.damaged){
            this.#move();
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, traffic);
        }
        if (this.sensor){
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map(
                s => s==null ? 0 : 1 - s.offset
            );
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);

            if(this.useBrain){
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }

    #assessDamage(roadBorders, traffic){
        for(let i = 0; i<roadBorders.length; i++){
            if(polysIntersect(this.polygon, roadBorders[i]))
                return true;
        }
        for(let i = 0; i<traffic.length; i++){
            if(polysIntersect(this.polygon, traffic[i].polygon))
                return true;
        }
        return false;
    }

    #createPolygon(){
        const points = [];
        const rad = Math.hypot(this.w, this.h)/2;
        const alpha = Math.atan2(this.w, this.h);
        points.push({
            x:this.x - Math.sin(this.angle - alpha) * rad,
            y:this.y - Math.cos(this.angle - alpha) * rad
        })
        points.push({
            x:this.x - Math.sin(this.angle + alpha) * rad,
            y:this.y - Math.cos(this.angle + alpha) * rad
        })
        points.push({
            x:this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y:this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        })
        points.push({
            x:this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y:this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        })
        return points;
    }

    #move(){
        // Forward and reverse
        if(this.controls.forward){
            this.velocity +=this.acceleration;
        }
        if(this.controls.reverse){
            this.velocity -=this.acceleration;
        }

        // Capping the velocity
        if(this.velocity>this.maxVelocity){
            this.velocity = this.maxVelocity;
        }
        if(this.velocity<-this.maxVelocity/2){
            this.velocity = -this.maxVelocity/2;
        }

        // Deceleration
        if(this.velocity>0){
            this.velocity -= this.friction;
        }
        if(this.velocity<0){
            this.velocity += this.friction;
        }

        // To stop the car and prevent it from bouncing
        if(Math.abs(this.velocity) < this.friction){
            this.velocity = 0;
        }

        // Left and Right
        if(this.velocity!==0){
            // flip will be -1 for reversing car
            const flip = this.velocity > 0 ? 1:-1;

            if(this.controls.left){
                this.angle += 0.03*flip;
            }
            if(this.controls.right){
                this.angle -= 0.03*flip;
            }
        }

        // Updating the position of the car in X-axis
        this.x -= Math.sin(this.angle)*this.velocity;

        // Updating the position of the car in Y-axis
        this.y -= Math.cos(this.angle)*this.velocity;
    }

    draw(ctx, color){
        this.damaged ? ctx.fillStyle="gray": ctx.fillStyle=color;
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for(let i = 1; i<this.polygon.length; i++){
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.fill();

        if (this.sensor)
            this.sensor.draw(ctx);
    }
}
