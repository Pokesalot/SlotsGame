function image(name){return `<img class="inline-image" alt="${name}" style src="images/${name}.png"></img>`;}
class Symbols {
    constructor(name, src, payout, rarity, description = ""){
        this.name = name;
        this.src = src;
        
        this.rarity = rarity; //Common = 0; Uncommon = 1; Rare = 2; Very Rare = 3; Special = 4;
        this.state = 0;
        this.description = description;
        if (description != ""){
            this.description = "----------<br />" + this.description
        }
        
        this.canStack = true;
        this.imageRotation = 0;
        this.lastPayout = 0;
        

        this.payout = payout; //Permanent payout adjustments

        this.tempPayout = 0; //Temporary payout adjustments, will be reset after each spin to 0,1
        this.tempMulti = 1;
    }
    getEffects(index,symbolsToShow){//Returns a list of locations in playersymbols that will be impacted by this symbol
        /*Expected return is always an array of strings of the form:
            [
                "index, payout * 2"
                "index, destroy"
                "index, payout + 1"
                "index, save"
            ]
            This is to include a symbol's own index, as all effects will be tabulated together, allowing precedence to be consistent
            Precedence will be
            - Payout + (forever)
            - Payout * (forever)
            - Destroy
            - Save
        */
       return [];
    }
    getPayout(effects){ 
        //Expected to return the total payout amount only. Destroying symbols is handled after all payouts
        //Effects given will only apply to this item. Symbol originating effects have positive indices, negative for items.
        this.lastPayout = 0;
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect.indexOf("forever") > -1){
                this.payout += parseInt(effects[i].effect);
            }else if(effects[i].effect.indexOf("+") > -1 || effects[i].effect.indexOf("-") == 0){ //Only looking for '-n' not '*-n'
                this.tempPayout += parseInt(effects[i].effect);
            }else if(effects[i].effect.indexOf("*") > -1){ //temp multi
                this.tempMulti *= parseInt(effects[i].effect.split("*")[1]);
            }//else it's a "save" or "destroy"
        }
        this.lastPayout = (this.payout + this.tempPayout) * this.tempMulti;
        this.tempPayout = 0;
        this.tempMulti = 1;
        return this.lastPayout;
    } 
    beingDestroyed(effects){
        let inDanger = false;
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                inDanger = true;
            }
        }
        return inDanger;
    }
    finalize(index, symbolsToShow){return 0;}//Mainly used for Wildcard effects, or other effects that require knowledge of other symbol final payouts
    Destroy(destroy, save){//All symbols have Destroy called at the end of all spins. Add post-spin effects here, then call super.Destroy() to destroy normally
        if(destroy && !save){
            this.onDestroy();
            this.remove();
        }
    }
    onDestroy(){//Destroy and save are both booleans, given from the main spin function
    }
    remove(){//Do not use to extend this function, use a custom onDestroy() or super.onDestroy()
        if(Object.keys(GameState.Destroyed).indexOf(this.name) > -1){
            //This item has been destroyed before
            GameState.Destroyed[this.name]++;
        }else{
            GameState.Destroyed[this.name] = 1;
        }
        GameState.Destroyed
        let index = GameState.PlayerSymbols.indexOf(this);
        GameState.PlayerSymbols.splice(index,1);
        delete this;
    }
    getSelfDestructEffect(){//Shortcut for simply returning an effect to remove itself
        this.index = GameState.PlayerSymbols.indexOf(this);
        return [ CreateEffect(this.index, this.index, "destroy") ]
    }
    giveEffectToAdjacent(nameArr,effect,index,symbolsToShow){
        let nextTo = GetAdjacentIndices(index);
        let effects = [];
        for (let i = 0; i<nextTo.length; i++){
            if(nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[nextTo[i]]].name) > -1 || nameArr == "*"){
                effects.push( CreateEffect( symbolsToShow[nextTo[i]], GameState.PlayerSymbols.indexOf(this), effect ) );
            }
        }
        return effects;
    }
    receiveEffectFromAdjacent(nameArr,effect,index,symbolsToShow){
        let nextTo = GetAdjacentIndices(index);
        let effects = [];
        for (let i = 0; i<nextTo.length; i++){
            if(nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[nextTo[i]]].name) > -1 || nameArr == "*"){
                effects.push( CreateEffect( GameState.PlayerSymbols.indexOf(this), symbolsToShow[nextTo[i]], effect ) );
            }
        }
        return effects;
    }
    giveEffectToAllSpun(nameArr,effect,index,symbolsToShow){
        let effects = [];
        for (let i = 0; i<20; i++){
            if(index != i && (nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[i]].name) > -1 || nameArr == "*")){
                effects.push( CreateEffect( symbolsToShow[i], GameState.PlayerSymbols.indexOf(this), effect ) );
            }
        }
        return effects;
    }
    receiveEffectFromAllSpun(nameArr,effect,index,symbolsToShow){
        let effects = [];
        for (let i = 0; i<20; i++){
            if(index != i && (nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[i]].name) > -1 || nameArr == "*")){
                effects.push( CreateEffect( GameState.PlayerSymbols.indexOf(this), symbolsToShow[i], effect ) );
            }
        }
        return effects;
    }
}

class Amethyst extends Symbols{ //Core
    constructor(){
        super("Amethyst","images/amethyst.png",1,2,`When another Symbol makes this symbol give more ${image("coin")}, permanently gives 1 more ${image("coin")}.`)
    }
    getPayout(effects){
        let gainedPerm = false;
        for (let i=0; i<effects.length;i++){
            if (effects[i].from > 0 && !gainedPerm){
                this.payout++;
                gainedPerm = false;
            }
        }
        return super.getPayout(effects);
    }
}
class Anchor extends Symbols{ //Core
    constructor(){
        super("Anchor","images/anchor.png",1,0,`Gives 4 more ${image("coin")} when in a corner.`);
    }
    getEffects(index, symbolsToShow){
        if([0,3,16,19].indexOf(index)!=-1){
            return [{
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"+4"
            }];
        }else{
            return [];
        }
    }
}
class Apple extends Symbols{ //Core
    constructor(){
        super("Apple","images/apple.png",3,2)
    }
}
class Banana extends Symbols{ //Core
    constructor(){
        super("Banana","images/banana.png",1,0,`Adds a ${image("banana_peel")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Banana_Peel);
    }
}
class Banana_Peel extends Symbols{ //Core
    constructor(){
        super("Banana Peel","images/banana_peel.png",1,0,`Destroys adjacent ${image("thief")}. Destroys itself after.`)
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Thief"],"destroy",index,symbolsToShow);
        if(gives.length > 0){
            gives = [...gives,...this.getSelfDestructEffect()]
        }
        return gives;
    }
}
class Bar_of_Soap extends Symbols{ //Core
    constructor(){
        super("Bar of Soap","images/bar_of_soap.png",1,1,`Gives ${image("bubble")} each spin. Destroys itself after giving coins 3 times.`);
        this.state = 3
    }
    Destroy(destroy,save){
        GameState.PlayerSymbols.push(new Bubble);
        super.Destroy(destroy,save)
    }
    getEffects(indx,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
}
class Bartender extends Symbols{ //Core
    constructor(){
        super("Bartender","images/bartender.png",3,2,`Has a 10% chance to add ${image("beer")}, ${image("wine")}, ${image("martini")}, or ${image("chemical_seven")}`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.1){
            let drinks = [
                [Beer],
                [Chemical_Seven,Wine],
                [Martini]
            ][Math.min(GetRarity(),2)];
            GameState.PlayerSymbols.push(new drinks[Math.floor(Math.random() * drinks.length)]);
        }
        return [];
    }
}
class Bear extends Symbols{ //Core
    constructor(){
        super("Bear","images/bear.png",2,1,`Destroys adjacent ${image("honey")}, gives 40 ${image("coin")} for each ${image("honey")} destroyed.`)
    }
    getEffects(index, symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Honey"], "destroy", index, symbolsToShow);
        let gets  = this.receiveEffectFromAdjacent(["Honey"], "+40", index, symbolsToShow);
        return [...gives,...gets]
    }
}
class Beastmaster extends Symbols{ //Core
    constructor(){
        super("Beastmaster","images/beastmaster.png",2,2,`"Adjacent ${image("magpie")} ${image("void_creature")} ${image("turtle")} ${image("snail")} ${image("sloth")} ${image("oyster")} ${image("owl")} ${image("mouse")} ${image("monkey")} ${image("rabbit")} ${image("goose")} ${image("goldfish")} ${image("dog")} ${image("crab")} ${image("chick")} ${image("cat")} ${image("bee")} ${image("sand_dollar")} ${image("wolf")} ${image("pufferfish")} ${image("jellyfish")} ${image("dove")} ${image("crow")} ${image("chicken")} ${image("bear")} ${image("cow")} and ${image("eldritch_creature")} give 2x more ${image("coin")}`)
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(
            [
                "Magpie",
                "Void Creature",
                "Turtle",
                "Snail",
                "Sloth",
                "Oyster",
                "Owl",
                "Mouse",
                "Monkey",
                "Rabbit",
                "Goose",
                "Goldfish",
                "Dog",
                "Crab",
                "Chick",
                "Cat",
                "Bee",
                "Sand Dollar",
                "Wolf",
                "Pufferfish",
                "Jellyfish",
                "Dove",
                "Crow",
                "Chicken",
                "Bear",
                "Cow",
                "Eldritch Creature"
            ], "*2",index,symbolsToShow);
    }
}
class Bee extends Symbols{ //Core
    constructor(){
        super("Bee","images/bee.png",1,0,`Adjacent ${image("flower")} and ${image("beehive")} give 2x ${image("coin")}. Gives 1 more ${image("coin")} for each adjacent ${image("flower")}, ${image("beehive")}, or ${image("honey")}.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Flower","Beehive"],"*2",index,symbolsToShow);
        let gets  = this.receiveEffectFromAdjacent(["Flower","Beehive","Honey"], "+1", index, symbolsToShow)
        return [...gives,...gets];
    }
}
class Beehive extends Symbols{ //Core
    constructor(){
        super("Beehive","images/beehive.png",3,2,`Has a 10% chance of adding ${image("honey")} each spin.`);
    }
    Destroy(destroy, save){
        if(Math.random() < 0.1){
            GameState.PlayerSymbols.push(new Honey);
        }
        super.onDestroy(destroy,save);
    }
}
class Beer extends Symbols{ //Core
    constructor(){
        super("Beer","images/beer.png",1,0)
    }
}
class Big_Ore extends Symbols{ //Core   
    constructor(){
        super("Big Ore","images/big_ore.png",1,0,`Adds 2 ${image("void_stone")}, ${image("amethyst")}, ${image("pearl")}, ${image("shiny_pebble")}, ${image("sapphire")}, ${image("emerald")}, ${image("ruby")}, or ${image("diamond")} when destroyed.`)
    }
    onDestroy(){
        let rarity = GetRarity();
        let stones = [
            [Pearl, Shiny_Pebble],
            [Void_Stone,Sapphire],
            [Amethyst,Emerald,Ruby],
            [Diamond]
        ][rarity];
        GameState.PlayerSymbols.push(stones[Math.floor(Math.random() * stones.length)]);
        rarity = GetRarity();
        stones = [
            [Pearl, Shiny_Pebble],
            [Void_Stone,Sapphire],
            [Amethyst,Emerald,Ruby],
            [Diamond]
        ][rarity];
        GameState.PlayerSymbols.push(stones[Math.floor(Math.random() * stones.length)]);
    }
}
class Big_Urn extends Symbols{ //Core
    constructor(){
        super("Big Urn","images/big_urn.png",2,1,`Adds 2 ${image("spirit")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Spirit);
        GameState.PlayerSymbols.push(new Spirit);
    }
}
class Billionaire extends Symbols{ //Core
    constructor(){
        super("Billionaire","images/billionaire.png",0,1,`Adjacent ${image("cheese")} and ${image("wine")} give 2x more ${image("coin")}. Gives 39 ${image("coin")} when destroyed.`);
        this.state = 39;
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Cheese","Wine"],"*2",index,symbolsToShow);
    }
    getPayout(effects){ 
        if(this.beingDestroyed(effects)){
            this.tempPayout += 39;
        }
        return super.getPayout(effects);
    }
}
class Bounty_Hunter extends Symbols{ //Core
    constructor(){
        super("Bounty Hunter","images/bounty_hunter.png",1,0,`Destroys adjacent ${image("thief")}. Gives 20 ${image("coin")} for each ${image("thief")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Thief"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Thief"],"+20",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Bronze_Arrow extends Symbols{
    constructor(){
        super("Bronze Arrow","images/bronze_arrow.png",0,1,`Points in a random direction. Symbols that are pointed to give 2x more ${image("coin")}. Destroys ${image("target")} that are pointed to.`)
    }
    getEffects(index,symbolsToShow){
        //Directions
        // 7 0 1
        // 6 A 2
        // 5 4 3
        let direction = [0,1,2,3,4,5,6,7][Math.floor(Math.random() * 8)];
        this.imageRotation = `${direction * 45}deg`
        let gives = []; let curInd = index;
        while(getNextPoint(curInd, direction) !== false){
            curInd = getNextPoint(curInd,direction);
            let sym = symbolsToShow[curInd];
            if (GameState.PlayerSymbols[sym].name == "Target"){
                gives.push(CreateEffect(sym,symbolsToShow[index],"destroy"));
            }
            gives.push(CreateEffect(sym,symbolsToShow[index],"*2"));
        }
        return gives;
    }
}
class Bubble extends Symbols{ //Core
    constructor(){
        super("Bubble","images/bubble.png",2,0,`Destroys itself after giving ${image("coin")} 3 times.`);
        this.state = 3;
    }
    getEffects(indx,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
}
class Buffing_Capsule extends Symbols{ //Core
    constructor(){
        super("Buffing Capsule","images/buffing_capsule.png",0,1,`Destroys itself. Adjacent symbols give 2x more ${image("coin")}.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent("*","*2",index,symbolsToShow);
        return [...gives,...this.getSelfDestructEffect()];
    }
}
class Card_Shark extends Symbols{ //Core
    //Adjacent Clubs Diamonds Hearts and Spades are Wildcard
    constructor(){
        super("Card Shark","images/card_shark.png",2,2,`Adjacecent ${image("clubs")}, ${image("diamonds")}, ${image("hearts")}, ${image("spades")} are ${image("wildcard")}.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Clubs","Diamonds","Hearts","Spades"],"+0",index,symbolsToShow);
        for (let i=0; i<gives.length; i++){
            GameState.PlayerSymbols[symbolsToShow[gives[i].to]].state = true;
        }
        return [];
    }
}
class Candy extends Symbols{ //Core
    constructor(){
        super("Candy","images/candy.png",1,0);
    }
}
class Cat extends Symbols{ //Core
    constructor(){
        super("Cat","images/cat.png",1,0,`Destroys adjacent ${image("milk")}. Gives 9 ${image("coin")} for each ${image("milk")} destroyed.`)
        this.state = false; //Can be wildcard-like, this signifies it.
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Milk"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Milk"],"+9",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Cheese extends Symbols{ //Core
    constructor(){
        super("Cheese","images/cheese.png",1,0);
    }
}
class Chef extends Symbols{
    constructor(){
        super("Chef","images/chef.png",0,1,`Adjacent ${image("chemical_seven")} ${image("void_fruit")} ${image("banana")} ${image("beer")} ${image("candy")} ${image("cheese")} ${image("cherry")} ${image("egg")} ${image("milk")} ${image("pear")} ${image("wine")} ${image("coconut_half")} ${image("orange")} ${image("peach")} ${image("strawberry")} ${image("omelette")} ${image("martini")} ${image("honey")} ${image("golden_egg")} ${image("apple")} and ${image("watermelon")} give 2x more ${image("coin")}.`)
    }
    getEffects(index, symbolsToShow){
        return this.giveEffectToAdjacent([
            "Chemical Seven",
            "Void Fruit",
            "Banana",
            "Beer",
            "Candy",
            "Cheese",
            "Cherry",
            "Egg",
            "Milk",
            "Pear",
            "Wine",
            "Coconut Half",
            "Orange",
            "Peach",
            "Strawberry",
            "Omelette",
            "Martini",
            "Honey",
            "Golden Egg",
            "Apple",
            "Watermelon"
        ], "*2",index,symbolsToShow);
    }
}
class Chemical_Seven extends Symbols{
    constructor(){
        super("Chemical Seven","images/chemical_seven.png",0,1,`Destroys itself. Gives 7 ${image("coin")} and ${image("lucky_seven")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        return [...this.getSelfDestructEffect(),{
            "to":GameState.PlayerSymbols.indexOf(this),
            "from":GameState.PlayerSymbols.indexOf(this),
            "effect":"+7"
        }]
    }
    onDestroy(){
    }
}
class Cherry extends Symbols{ //Core
    constructor(){
        super("Cherry","images/cherry.png",1,0);
    }
}
class Chick extends Symbols{ //Core
    constructor(){
        super("Chick","images/chick.png",1,1,`Has a 10% chance of growing into ${image("chicken")}.`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < .1){
            GameState.PlayerSymbols.push(new Chicken);
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
}
class Chicken extends Symbols{ //Core
    constructor(){
        super("Chicken","images/chicken.png",2,2,`Has a 5% chance of adding ${image("egg")}. Has a 1% chance of adding ${image("golden_egg")}`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < .05){
            GameState.PlayerSymbols.push(new Egg);
        }
        if(Math.random() < 0.01){
            GameState.PlayerSymbols.push(new Golden_Egg);
        }
        return [];
    }
}
class Clubs extends Symbols{ //Core
    constructor(){
        super("Clubs","images/clubs.png",1,1,`Adjacent ${image("clubs")} and ${image("spades")} give 1 more ${image("coin")}. Gives 1 more ${image("coin")} if there are at least 3 ${image("clubs")} ${image("diamonds")} ${image("hearts")} or ${image("spades")}.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Clubs","Spades"],"+1",index,symbolsToShow);
        let gets = this.receiveEffectFromAllSpun(["Clubs","Spades","Hearts","Diamonds"],"+1",index,symbolsToShow);
        if(gets.length >= 2){ //Itself counts as one of the symbols, so two more is a payout
            gives.push(gets[0]);
        }
        let isWild = this.receiveEffectFromAdjacent(["Card Shark"],"Wild",index,symbolsToShow);
        if (isWild.length > 0){
            this.state = true;
        }
        return gives;
    }
    getPayout(effects){
        if(!this.state){
            //Normal operation
            return super.getPayout(effects);
        }else{
            return 0;
        }
    }
    finalize(index,symbolsToShow){
        if(this.state){
            //Acting as a wildcard
            let neighbors = GetAdjacentIndices(index);
            let maxPayout = -100000; //Probably the lowest payout that can be had
            for (let i=0; i<neighbors.length; i++){
                if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name == "Wildcard"){continue;}
                else if(["Clubs","Spades","Diamonds","Hearts","Cat"].indexOf(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name) > -1){
                    //All 5 of these symbols have no other state, so just check for state=true to signify wildcard-like
                    if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].state){continue;}
                    else{
                        maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout)
                    }
                }else{
                    maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout)
                }
            }
            this.lastPayout = (maxPayout + this.tempPayout) * this.tempMulti;

            this.tempPayout = 0;
            this.tempMulti = 1;
            this.state = false;
            return this.lastPayout;
        }else{
            //Not acting as a wildcard
            return 0;
        }
    }
}
class Coal extends Symbols{ //Core
    constructor(){
        super("Coal","images/coal.png",0,0,`Transforms into ${image("diamond")} after 20 spins.`)
        this.state = 20;
    }
    getEffects(index,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Diamond);
    }
}
class Coconut extends Symbols{ //Core
    constructor(){
        super("Coconut","images/coconut.png",1,2,`Adds two ${image("coconut_half")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Coconut_Half);
        GameState.PlayerSymbols.push(new Coconut_Half);
    }
}
class Coconut_Half extends Symbols{ //Core
    constructor(){
        super("Coconut Half","images/coconut_half.png",2,2);
    }
}
class Coin extends Symbols{ //Core
    constructor(){
        super("Coin","images/coin.png",1,0);
    }
}
class Comedian extends Symbols{
    constructor(){
        super("Comedian","images/comedian.png",3,2,`Adjacent ${image("banana")} ${image("banana_peel")} ${image("dog")} ${image("monkey")} ${image("toddler")} and ${image("joker")} give 3x more ${image("coin")}`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Banana","Banana Peel","Dog","Monkey","Toddler","Joker"],"*3",index,symbolsToShow)
    }
}
class Cow extends Symbols{ //Core
    constructor(){
        super("Cow","images/cow.png",3,2,`Has a 15% chance to add ${image("milk")}`);
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.15){
            GameState.PlayerSymbols.push(new Milk);
        }
        return [];
    }
}
class Crab extends Symbols{
    constructor(){
        super("Crab","images/crab.png",1,0,`Gives +3 ${image("coin")} for each other ${image("crab")} in the same row.`);
    }
    getEffects(index, symbolsToShow){
        let row = index % 4; let gets = [];
        for (let i=0; i<=16; i+= 4){
            if (GameState.PlayerSymbols[symbolsToShow[i + row]].name == "Crab" && i+row != index){
                gets.push({
                    "to": symbolsToShow[index],
                    "from": symbolsToShow[i + row],
                    "effect": "+3"
                })
            }
        }
        return gets;
    }
}
class Crow extends Symbols{ //Core
    constructor(){
        super("Crow","images/crow.png",2,0,`Gives -3 ${image("coin")} every 4 spins`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if (this.state >= getThreshold("Crow")){
            this.state -+ getThreshold("Crow");
            return [{
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"-3"
            }]
        }else{
            return [];
        }
    }
}
class Cultist extends Symbols{
    constructor(){
        super("Cultist","images/cultist.png",0,0,`Gives 1 ${image("coin")} more for each other ${image("cultist")}. Gives 1 more ${image("coin")} if there are at least 3 ${image("cultist")}.`);
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAllSpun(["Cultist"],"+1",index,symbolsToShow);
        if (gets.length >= 3){
            gets.push({
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"+1"
            });
        }
        return gets;
    }
}
class Dame extends Symbols{
    constructor(){
        super("Dame","images/dame.png",2,2,`Adjacent ${image("void_stone")}, ${image("amethyst")}, ${image("pearl")}, ${image("shiny_pebble")}, ${image("sapphire")}, ${image("emerald")}, ${image("ruby")}, and ${image("diamond")} give 2x more ${image("coin")}. Destroys adjacent ${image("martini")}. Gives 40 ${image("coin")} for each ${image("martini")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Void Stone","Amethyst","Pearl","Shiny Pebble","Sapphire","Emerald","Ruby","Diamond"],"*2",index,symbolsToShow);
        gives = [...gives,...this.giveEffectToAdjacent(["Martini"],"destroy",index,symbolsToShow)];
        let gets = this.receiveEffectFromAdjacent(["Martini"],"+40",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Diamond extends Symbols{ //Core
    constructor(){
        super("Diamond","images/diamond.png",5,3,`Gives 1 ${image("coin")} more for each other ${image("diamond")}.`);
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAllSpun(["Diamond"],"+1",index,symbolsToShow);
    }
}
class Diamonds extends Symbols{
    constructor(){
        super("Diamonds","images/diamonds.png",1,1,`Adjacent ${image("hearts")} and ${image("diamonds")} give 1 more ${image("coin")}. Gives 1 more ${image("coin")} if there are at least 3 ${image("clubs")} ${image("diamonds")} ${image("hearts")} or ${image("spades")}`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Hearts","Diamonds"],"+1",index,symbolsToShow);
        let gets = this.receiveEffectFromAllSpun(["Clubs","Spades","Hearts","Diamonds"],"+1",index,symbolsToShow);
        if(gets.length >= 2){ //Itself counts as one of the symbols, so two more is a payout
            gives.push(gets[0]);
        }
        let isWild = this.receiveEffectFromAdjacent(["Card Shark"],"Wild",index,symbolsToShow);
        if (isWild.length > 0){
            this.state = true;
        }
        return gives;
    }
    getPayout(effects){
        if(!this.state){
            //Normal operation
            return super.getPayout(effects);
        }else{
            return 0;
        }
    }
    finalize(index,symbolsToShow){
        if(this.state){
            //Acting as a wildcard
            let neighbors = GetAdjacentIndices(index);
            let maxPayout = -100000; //Probably the lowest payout that can be had
            for (let i=0; i<neighbors.length; i++){
                if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name == "Wildcard"){continue;}
                else if(["Clubs","Spades","Diamonds","Hearts","Cat"].indexOf(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name) > -1){
                    //All 5 of these symbols have no other state, so just check for state=true to signify wildcard-like
                    if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].state){continue;}
                    else{
                        maxPayout = Math.max(maxPayout, parseInt(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout));
                    }
                }else{
                    maxPayout = Math.max(maxPayout, parseInt(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout));
                }
            }
            this.lastPayout = (maxPayout + this.tempPayout) * this.tempMulti;
            this.tempPayout = 0;
            this.tempMulti = 1;
            this.state = false;
            return this.lastPayout;
        }else{
            //Not acting as a wildcard
            return 0;
        }
    }
}
class Diver extends Symbols{
    constructor(){
        super("Diver","images/diver.png",2,2,`Removes adjacent ${image("snail")} ${image("turtle")} ${image("anchor")} ${image("crab")} ${image("goldfish")} ${image("oyster")} ${image("pearl")} ${image("jellyfish")} ${image("pufferfish")} and ${image("sand_dollar")}. Permanently gives 1 ${image("coin")} for each symbol removed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Snail","Turtle","Anchor","Crab","Goldfish","Oyster","Pearl","Jellyfish","Pufferfish","Sand Dollar."],"remove",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Snail","Turtle","Anchor","Crab","Goldfish","Oyster","Pearl","Jellyfish","Pufferfish","Sand Dollar."],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Dog extends Symbols{
    constructor(){
        super("Dog","images/dog.png",1,0,`Gives 1 ${image("coin")} more if adjacent to ${image("robin_hood")} ${image("thief")} ${image("cultist")} ${image("toddler")} ${image("bounty_hunter")} ${image("miner")} ${image("dwarf")} ${image("king_midas")} ${image("gambler")} ${image("general_zaroff")} ${image("witch")} ${image("pirate")} ${image("ninja")} ${image("mrs_fruit")} ${image("hooligan")} ${image("farmer")} ${image("diver")} ${image("dame")} ${image("chef")} ${image("card_shark")} ${image("beastmaster")} ${image("geologist")} ${image("joker")} ${image("comedian")} or ${image("bartender")}`)
    }
    getEffects(index, symbolsToShow){
        let gets = this.receiveEffectFromAdjacent(["Robin Hood","Thief","Cultist","Toddler","Bounty Hunter","Miner","Dwarf","King Midas","Gambler","General Zaroff","Witch","Pirate","Ninja","Mrs Fruit","Hooligan","Farmer","Diver","Dame","Chef","Card Shark","Beastmaster","Geologist","Joker","Comedian","Bartender"],"+1",index,symbolsToShow);
        return [gets[0]];
    }
}
class Dove extends Symbols{
    constructor(){
        super("Dove","images/dove.png",2,2,`If an adjacent symbol would be destroyed, instead it isn't and this symbol permanently gives 1 ${image("coin")} more.`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent("*","save",index,symbolsToShow);
    }
    //Save effects are handled in the spin() function of slots.js, since it seems to be the only symbol with this property
}
class Dud extends Symbols{ //Core
    constructor(spins){
        super("Dud","images/dud.png",0,4,`Destroys itself after ${spins} spins.`);
        this.state = spins;
    }
    getEffects(index,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }
        else{
            return [];
        }
    }
}
class Dwarf extends Symbols{
    constructor(){
        super("Dwarf","images/dwarf.png",1,0,`Destroys adjacent ${image("beer")} and ${image("wine")}. Gives ${image("coin")} equal to 10x the value of symbols destroyed this way.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Beer","Wine"],"destroy",index,symbolsToShow);
        let gets1 = this.receiveEffectFromAdjacent(["Beer"],"+10",index,symbolsToShow);
        let gets2 = this.receiveEffectFromAdjacent(["Wine"],"+20",index.symbolsToShow);
        return [...gives,...gets1,...gets2];
    }
}
class Egg extends Symbols{
    constructor(){
        super("Egg","images/egg.png",1,0,`Has a 10% chance to transform into a ${image("chick")}.`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < .1){
            GameState.PlayerSymbols.push(new Chick);
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
}
class Eldritch_Creature extends Symbols{
    constructor(){
        super("Eldritch Creature","images/eldritch_creature.png",4,3,`Destroys adjacent ${image("cultist")}, ${image("witch")}, ${image("hex_of_destruction")}, ${image("hex_of_draining")}, ${image("hex_of_emptiness")}, ${image("hex_of_hoarding")}, ${image("hex_of_midas")}, ${image("hex_of_tedium")}, and ${image("hex_of_thievery")}. Gives 1 ${image("coin")} for each ${image("cultist")}, ${image("witch")}, ${image("hex_of_destruction")}, ${image("hex_of_draining")}, ${image("hex_of_emptiness")}, ${image("hex_of_hoarding")}, ${image("hex_of_midas")}, ${image("hex_of_tedium")}, and ${image("hex_of_thievery")} destroyed or removed this game`);
    }
    getEffects(index,symbolsToShow){
        let checks = 
        [
            "Cultist", 
            "Witch", 
            "Hex of Destruction", 
            "Hex of Draining", 
            "Hex of Emptiness", 
            "Hex of Hoarding", 
            "Hex of Midas", 
            "Hex of Tedium", 
            "Hex of Thievery"
        ];
        let gives = this.giveEffectToAdjacent(checks, "destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(checks, "+1",index,symbolsToShow);
        let totalRemoved = 0;
        for (let i=0; i<checks.length; i++){
            if ( Object.keys(GameState.Destroyed).indexOf(checks[i])>-1){
                //Have seen these and destroyed them
                totalRemoved += GameState.Destroyed[checks[i]];
            }
        }
        return [
            ...gives,
            ...gets,
            {
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":`+${totalRemoved}`
            }
        ];
    }
}
class Emerald extends Symbols{
    constructor(){
        super("Emerald","images/emerald.png",3,2,`Gives 1 ${image("coin")} more if there are at least 2 ${image("emerald")}.`);
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAllSpun(["Emerald"],"+1",index,symbolsToShow);
        if (gets.length >= 2){
            return gets[0];
        }else{
            return [];
        }
    }
}
class Empty extends Symbols{ //Core
    constructor(){
        super("Empty","images/empty.png",0,4);
    }
    getEffects(index,symbolsToShow){
        return this.getSelfDestructEffect();
    }
    Destroy(destroy, save){ //Cannot be saved, no matter what
        if(destroy){
            this.remove();
        }
    }
}
class Essence_Capsule extends Symbols{
    constructor(){
        super("Essence Capsule","images/essence_capsule.png",-12,1,`Destroys itself. Gives 1 ${image("essence_token")} when destroyed.`)
    }
    onDestroy(){
        //TODO add essence token
    }
}
class Farmer extends Symbols{
    constructor(){
        super("Farmer","images/farmer.png",2,2,`Adjacent ${image("void_fruit")} ${image("banana")} ${image("cheese")} ${image("cherry")} ${image("chick")} ${image("coconut")} ${image("seed")} ${image("egg")} ${image("flower")} ${image("milk")} ${image("pear")} ${image("chicken")} ${image("orange")} ${image("peach")} ${image("strawberry")} ${image("golden_egg")} ${image("cow")} ${image("apple")} and ${image("watermelon")} give 2x more ${image("coin")}. Adjacent ${image("seed")} are 50% more likely to grow.`)
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Void Fruit","Banana","Cheese","Cherry","Chick","Coconut","Seed","Egg","Flower","Milk","Pear","Chicken","Orange","Peach","Strawberry","Golden Egg","Cow","Apple","Watermelon"],"*2",index,symbolsToShow);
    }
}
class Five_Sided_Die extends Symbols{
    constructor(){
        super("Five Sided Die","images/five_sided_die.png",0,1,`Pays between 1 Coin and 5 ${image("coin")} randomly.`)
    }
    getEffects(index,symbolsToShow){
        this.state = [1,2,3,4,5][Math.floor(Math.random()*5)];
        return [{
            "to":GameState.PlayerSymbols.indexOf(this),
            "from":GameState.PlayerSymbols.indexOf(this),
            "effect":`+${this.state}`
        }]
    }
}
class Flower extends Symbols{ //Core
    constructor(){
        super("Flower","images/flower.png",1,0);
    }
}
class Frozen_Fossil extends Symbols{
    constructor(){
        super("Frozen Fossil","images/frozen_fossil.png",0,2,`Destroys itself after 20 spins. The amount of spins needed is reduced by 5 for each ${image("cultist")} ${image("witch")} ${image("hex_of_destruction")} ${image("hex_of_draining")} ${image("hex_of_emptiness")} ${image("hex_of_hoarding")} ${image("hex_of_midas")} ${image("hex_of_tedium")} and ${image("hex_of_thievery")} destroyed or removed this game. Adds ${image("eldritch_creature")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        let checks = 
        [
            "Cultist", 
            "Witch", 
            "Hex of Destruction", 
            "Hex of Draining", 
            "Hex of Emptiness", 
            "Hex of Hoarding", 
            "Hex of Midas", 
            "Hex of Tedium", 
            "Hex of Thievery"
        ];
        let totalRemoved = 0;
        for (let i=0; i<checks.length; i++){
            if ( Object.keys(GameState.Destroyed).indexOf(checks[i])>-1){
                //Have seen these and destroyed them
                totalRemoved += (5 * GameState.Destroyed[checks[i]]);
            }
        }
        if (this.state + totalRemoved > getThreshold("Frozen Fossil")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Eldritch_Creature);
    }
}
class Gambler extends Symbols{
    constructor(){
        super("Gambler","images/gambler.png",1,0,`Gives ${image("coin")} ? when destroyed where ? increases by ${image("coin")} 2 each spin. Destroys itself when ${image("five_sided_die")} or ${image("three_sided_die")} rolls 1`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state += 2;
        let gets = this.receiveEffectFromAllSpun(["Three Sided Die","Five Sided Die"],"+0",index,symbolsToShow);
        for(let i=0; i<gets.length; i++){
            if( GameState.PlayerSymbols[gets[i].from].state == 1){
                return this.getSelfDestructEffect();
            }
        }
        return [];
    }
    getPayout(effects){
        if (this.beingDestroyed(effects)){
            this.tempPayout += this.state;
        }
        return super.getPayout(effects);
    }
}
class General_Zaroff extends Symbols{
    constructor(){
        super("General Zaroff","images/general_zaroff.png",1,2,`Destroys adjacent ${image("robin_hood")} ${image("thief")} ${image("billionaire")} ${image("cultist")} ${image("toddler")} ${image("bounty_hunter")} ${image("miner")} ${image("dwarf")} ${image("king_midas")} ${image("gambler")} ${image("general_zaroff")} ${image("witch")} ${image("pirate")} ${image("ninja")} ${image("mrs_fruit")} ${image("hooligan")} ${image("farmer")} ${image("diver")} ${image("dame")} ${image("chef")} ${image("card_shark")} ${image("beastmaster")} ${image("geologist")} ${image("joker")} ${image("comedian")} and ${image("bartender")}. Gives 20 ${image("coin")} for each symbol destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let affects = [
            "Robin Hood",
            "Thief",
            "Billionaire",
            "Cultist",
            "Toddler",
            "Bounty Hunter",
            "Miner",
            "Dwarf",
            "King Midas",
            "Gambler",
            "General Zaroff",
            "Witch",
            "Pirate",
            "Ninja",
            "Mrs Fruit",
            "Hooligan",
            "Farmer",
            "Diver",
            "Dame",
            "Chef",
            "Card Shark",
            "Beastmaster",
            "Geologist",
            "Joker",
            "Comedian",
            "Bartender"
        ]
        let gives = this.giveEffectToAdjacent(affects,"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(affects,"+20",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Geologist extends Symbols{
    constructor(){
        super("Geologist","images/geologist.png",2,2,`Destroys adjacent ${image("ore")} ${image("pearl")} ${image("shiny_pebble")} ${image("big_ore")} and ${image("sapphire")}. Permanently gives 1 ${image("coin")} for each symbol destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Ore","Pearl","Shiny Pebble","Big Ore","Sapphire"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Ore","Pearl","Shiny Pebble","Big Ore","Sapphire"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Goldfish extends Symbols{
    constructor(){
        super("Goldfish","images/goldfish.png",1,0,`Destroys adjacent ${image("bubble")}. Gives 15 ${image("coin")} for each ${image("bubble")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Bubble"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Bubble"],"+15",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Golem extends Symbols{
    constructor(){
        super("Golem","images/golem.png",0,1,`Destroys itself after 5 spins. Adds 5 ${image("ore")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Golem")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        if(destroy){ //Don't try to save the golem, no matter what
            GameState.PlayerSymbols.push(new Ore);
            GameState.PlayerSymbols.push(new Ore);
            GameState.PlayerSymbols.push(new Ore);
            GameState.PlayerSymbols.push(new Ore);
            GameState.PlayerSymbols.push(new Ore);
            this.remove();
        }
    }
}
class Golden_Arrow extends Symbols{
    constructor(){
        super("Golden Arrow","images/golden_arrow.png",0,1,`Points in a random direction. Symbols that are pointed to give 4x more ${image("coin")}. Destroys ${image("target")} that are pointed to.`)
    }
    getEffects(index,symbolsToShow){
        //Directions
        // 7 0 1
        // 6 A 2
        // 5 4 3
        let direction = [0,1,2,3,4,5,6,7][Math.floor(Math.random() * 8)];
        this.imageRotation = `${direction * 45}deg`
        let gives = []; let curInd = index;
        while(getNextPoint(curInd, direction) !== false){
            curInd = getNextPoint(curInd,direction);
            let sym = symbolsToShow[curInd];
            if (GameState.PlayerSymbols[sym].name == "Target"){
                gives.push(CreateEffect(sym,symbolsToShow[index],"destroy"));
            }
            gives.push(CreateEffect(sym,symbolsToShow[index],"*4"));
        }
        return gives;
    }
}
class Golden_Egg extends Symbols{ //Core
    constructor(){
        super("Golden Egg","images/golden_egg.png",4,2);
    }
}
class Goose extends Symbols{
    constructor(){
        super("Goose","images/goose.png",1,0,`Has a 1% chance of adding ${image("golden_egg")}`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.01){
            GameState.PlayerSymbols.push(new Golden_Egg);
        }
        return [];
    }
}
class Hearts extends Symbols{
    constructor(){
        super("Hearts","images/hearts.png",1,1,`Adjacent ${image("hearts")} and ${image("diamonds")} give 1 more ${image("coin")}. Gives 1 more ${image("coin")} if there are at least 3 ${image("clubs")} ${image("diamonds")} ${image("hearts")} or ${image("spades")}.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Hearts","Diamonds"],"+1",index,symbolsToShow);
        let gets = this.receiveEffectFromAllSpun(["Clubs","Spades","Hearts","Diamonds"],"+1",index,symbolsToShow);
        if(gets.length >= 2){ //Itself counts as one of the symbols, so two more is a payout
            gives.push(gets[0]);
        }
        let isWild = this.receiveEffectFromAdjacent(["Card Shark"],"Wild",index,symbolsToShow);
        if (isWild.length > 0){
            this.state = true;
        }
        return gives;
    }
    getPayout(effects){
        if(!this.state){
            //Normal operation
            return super.getPayout(effects);
        }else{
            return 0;
        }
    }
    finalize(index,symbolsToShow){
        if(this.state){
            //Acting as a wildcard
            let neighbors = GetAdjacentIndices(index);
            let maxPayout = -100000; //Probably the lowest payout that can be had
            for (let i=0; i<neighbors.length; i++){
                if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name == "Wildcard"){continue;}
                else if(["Clubs","Spades","Diamonds","Hearts","Cat"].indexOf(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name) > -1){
                    //All 5 of these symbols have no other state, so just check for state=true to signify wildcard-like
                    if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].state){continue;}
                    else{
                        maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout);
                    }
                }else{
                    maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout);
                }
            }
            this.lastPayout = (maxPayout + this.tempPayout) * this.tempMulti;
            this.tempPayout = 0;
            this.tempMulti = 1;
            this.state = false;
            return this.lastPayout;
        }else{
            //Not acting as a wildcard
            return 0;
        }
    }
}
class Hex_of_Destruction extends Symbols{
    constructor(){
        super("Hex of Destruction","images/hex_of_destruction.png",3,1,"Has a 30% chance to destroy an adjacent symbol.");
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3){
            let gives = this.giveEffectToAdjacent("*","destroy",index,symbolsToShow);
            return [gives[Math.floor(Math.random() * gives.length)]];
        }else{
            return [];
        }
    }
}
class Hex_of_Draining extends Symbols{
    constructor(){
        super("Hex of Draining","images/hex_of_draining.png",3,1,`Has a 30% chance to make an adjacent symbol give 0 ${image("coin")}`);
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3){
            let gives = this.giveEffectToAdjacent("*","*0",index,symbolsToShow);
            return [gives[Math.floor(Math.random() * gives.length)]];
        }else{
            return [];
        }
    }
}
class Hex_of_Emptiness extends Symbols{
    constructor(){
        super("Hex of Emptiness","images/hex_of_emptiness.png",3,1,"Has a 30% chance of forcing you to skip the shop.")
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3 && GameState.canSkip){ //If there's a fallback, turn off buying
            GameState.canBuy = false;
        }
        return [];
    }
}
class Hex_of_Hoarding extends Symbols{
    constructor(){
        super("Hex of Hoarding","images/hex_of_hoarding.png",3,1,"Has a 30% chance of forcing you to add a symbol from the shop after each spin.");
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3 && GameState.canBuy){ //If there's a fallback, turn off skipping
            GameState.canSkip = false;
        }
        return [];
    }
}
class Hex_of_Midas extends Symbols{
    constructor(){
        super("Hex of Midas","images/hex_of_midas.png",3,1,`Has a 30% chance of adding ${image("coin")}`);
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3){
            GameState.PlayerSymbols.push(new Coin);
        }
        return [];
    }
}
class Hex_of_Tedium extends Symbols{
    constructor(){
        super("Hex of Tedium","images/hex_of_tedium.png",3,1,"You are 1.2x less likely to find Uncommon, Rare, and Very Rare symbols.");
        GameState.RarityMulti -= 1.2;
    }
    onDestroy(){
        GameState.RarityMulti += 1.2;
    }
}
class Hex_of_Thievery extends Symbols{
    constructor(){
        super("Hex of Thievery","images/hex_of_thievery.png",3,1,`Has a 30% chance to take 6 ${image("coin")}`);
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.3){
            GameState.PlayerCoins -= 6;
        }
        return [];
    }
}
class Highlander extends Symbols{
    constructor(){
        super("Highlander","images/highlander.png",6,3,"There can be only one.");
    }
}
class Honey extends Symbols{ //Core
    constructor(){
        super("Honey","images/honey.png",3,2)
    }
}
class Hooligan extends Symbols{
    constructor(){
        super("Hooligan","images/hooligan.png",2,1,`Destroys adjacent ${image("urn")} ${image("big_urn")} and ${image("tomb")}. Gives 6 ${image("coin")} for each ${image("urn")} ${image("big_urn")} and ${image("tomb")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Urn","Big Urn","Tomb"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Urn","Big Urn","Tomb"],"+6",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Hustling_Capsule extends Symbols{
    constructor(){
        super("Hustling Capsule","images/hustling_capsule.png",0,1,`Destroys itself. Adds 1 ${image("pool_ball")} when destroyed.`)
    }
    getEffects(index,symbolsToShow){
        return this.getSelfDestructEffect();
    }
    onDestroy(){
        //TODO give common item
    }
}
class Item_Capsule extends Symbols{
    constructor(){
        super("Item Capsule","images/item_capsule.png",0,1,"Destroys itself. Adds 1 Common item when destroyed.")
    }
    getEffects(index,symbolsToShow){
        return this.getSelfDestructEffect();
    }
    onDestroy(){
        //TODO give common item
    }
}
class Jellyfish extends Symbols{
    constructor(){
        super("Jellyfish","images/jellyfish.png",2,1,`Gives 1 ${image("removal_token")} when removed.`);
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if (effects[i].effect == "remove"){
                //TODO add removal token
                this.willBeRemoved = true;
            }
        }
        return super.getPayout(effects);
    }
    Destroy(destroy,save){
        if(this.willBeRemoved){
            this.remove();
        }else{
            super.Destroy(destroy, save);
        }
    }
}
class Joker extends Symbols{
    constructor(){
        super("Joker","images/joker.png",3,2,`Adjacent ${image("clubs")} ${image("diamonds")} ${image("hearts")} and ${image("spades")} give 2x more ${image("coin")}.`)
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Clubs","Spades","Hearts","Diamonds"],"*2",index,symbolsToShow);
    }
}
class Key extends Symbols{
    constructor(){
        super("Key","images/key.png",1,0,`Destroys adjacent ${image("lockbox")} ${image("safe")} ${image("treasure_chest")} and ${image("mega_chest")}. Destroys itself afterward.`)
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Lockbox","Safe","Treasure Chest","Mega Chest"],"destroy",index,symbolsToShow);
        let gets = this.getSelfDestructEffect();
        return [...gives,...gets];
    }
}
class King_Midas extends Symbols{
    constructor(){
        super("King Midas","images/king_midas.png",1,2,`Gives ${image("coin")} every spin. Adjacent ${image("coin")} give 3x more ${image("coin")}.`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Coin"],"*3",index,symbolsToShow);
    }
    Destroy(destroy,save){
        GameState.PlayerSymbols.push(new Coin);
        super.Destroy(destroy,save);
    }
}
class Lightbulb extends Symbols{
    constructor(){
        super("Lightbulb","images/lightbulb.png",1,0,`Adjacent ${image("void_stone")} ${image("amethyst")} ${image("pearl")} ${image("shiny_pebble")} ${image("sapphire")} ${image("emerald")} ${image("ruby")} and ${image("diamond")} give 2x more ${image("coin")}. Destroys itself after making other symbols give additional ${image("coin")} 5 times.`);
        this.state = 5;
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Void Stone","Amethyst","Pearl","Shiny Pebble","Sapphire","Emerald","Ruby","Diamond"],"*2",index,symbolsToShow);
        if(gives.length > 0){
            this.state--;
        }
        if(this.state == 0){
            gives = [...gives,...this.getSelfDestructEffect()];
        }
        return gives;
    }

}
class Lockbox extends Symbols{
    constructor(){
        super("Lockbox","images/lockbox.png",1,0,`Gives 15 ${image("coin")} when destroyed.`);
        this.state = 15;
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                this.tempPayout += this.state;
                break;
            }
        }
        return super.getPayout(effects);
    }
}
class Lucky_Capsule extends Symbols{
    constructor(){
        super("Lucky Capsule","images/lucky_capsule.png",0,1,"Destroys itself. At least one of the next symbols to add will be Rare or better.");
    }
    getEffects(index,symbolsToShow){
        return this.getSelfDestructEffect();
    }
    onDestroy(){
        GameState.ForcedRarities.push("Rare");
    }
}
class Magic_Key extends Symbols{
    constructor(){
        super("Magic Key","images/magic_key.png",2,2,`Destroys adjacent ${image("lockbox")} ${image("safe")} ${image("treasure_chest")} and ${image("mega_chest")}. Symbols destroyed this way give 3x more ${image("coin")}. Destroys itself afterward.`);
    }
    getEffects(index,symbolsToShow){
        let gives1 = this.giveEffectToAdjacent(["Lockbox","Safe","Treasure Chest","Mega Chest"],"*3",index,symbolsToShow);
        let gives2 = this.giveEffectToAdjacent(["Lockbox","Safe","Treasure Chest","Mega Chest"],"destroy",index,symbolsToShow);
        let gets = this.getSelfDestructEffect();
        return [...gives1,...gives2,...gets];
    }
}
class Magpie extends Symbols{
    constructor(){
        super("Magpie","images/magpie.png",-1,0,`Gives 9 ${image("coin")} every 4 spins.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Magpie")){
            this.state -= getThreshold("Magpie");
            return [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+9")]
        }
        else{
            return [];
        }
    }
}
class Martini extends Symbols{ //Core
    constructor(){
        super("Martini","images/martini.png",3,2);
    }
}
class Matryoshka_Doll extends Symbols{
    constructor(){
        super("Matryoshka Doll","images/matryoshka_1.png",0,1,`Destroys itself after 3 spins. Adds ${image("matryoshka_2")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Matryoshka Doll")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        if(destroy){//Don't save the doll no matter what, just remove it and get the upgrade
            GameState.PlayerSymbols.push(new Matryoshka_Doll_2);
            this.remove();
        }
    }
}
class Matryoshka_Doll_2 extends Symbols{
    constructor(){
        super("Matryoshka Doll 2","images/matryoshka_2.png",1,4,`Destroys itself after 5 spins. Adds ${image("matryoshka_3")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Matryoshka Doll 2")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        if(destroy){
            GameState.PlayerSymbols.push(new Matryoshka_Doll_3);
            this.remove();
        }
    }
}
class Matryoshka_Doll_3 extends Symbols{
    constructor(){
        super("Matryoshka Doll 3","images/matryoshka_3.png",2,4,`Destroys itself after 7 spins. Adds ${image("matryoshka_4")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Matryoshka Doll 3")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        if(destroy){
            GameState.PlayerSymbols.push(new Matryoshka_Doll_4);
            this.remove();
        }
    }
}
class Matryoshka_Doll_4 extends Symbols{
    constructor(){
        super("Matryoshka Doll 4","images/matryoshka_4.png",3,4,`Destroys itself after 9 spins. Adds ${image("matryoshka_5")} when destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Matryoshka Doll 4")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        if(destroy){
            GameState.PlayerSymbols.push(new Matryoshka_Doll_5);
            this.remove();
        }
    }
}
class Matryoshka_Doll_5 extends Symbols{
    constructor(){
        super("Matryoshka Doll 5","images/matryoshka_5.png",4,4);
    }
}
class Mega_Chest extends Symbols{
    constructor(){
        super("Mega Chest","images/mega_chest.png",3,3,`Gives 100 ${image("coin")} when destroyed.`)
        this.state = 100;
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                this.tempPayout += this.state;
                break;
            }
        }
        return super.getPayout(effects);
    }
}
class Milk extends Symbols{ //Core
    constructor(){
        super("Milk","images/milk.png",1,0);
    }
}
class Midas_Bomb extends Symbols{
    constructor(){
        super("Midas Bomb","images/midas_bomb.png",0,3,`Destroys itself and adjacent symbols. Symbols destroyed this way give ${image("coin")} equal to 7x their value.`);
    }
    getEffects(index,symbolsToShow){
        let gives1 = this.giveEffectToAdjacent("*","destroy",index,symbolsToShow);
        let gives = this.getSelfDestructEffect();
        for (let i=0; i<gives1.length; i++){
            let giveVal = GameState.PlayerSymbols[gives1[i].to].payout * 7;
            gives.push(gives1[i]);
            gives.push(CreateEffect(gives1[i].to, gives1[i].from, `+${giveVal}`));
        }
        return gives;
    }
}
class Mine extends Symbols{ //Core
    constructor(){
        super("Mine","images/mine.png",4,3,`Adds ${image("ore")} each spin. Destroys itself after giving ${image("coin")} 4 times. Adds 1 ${image("mining_pick")} when destroyed.`);
        this.state = 4;
    }
    getEffects(index,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    Destroy(destroy,save){
        GameState.PlayerSymbols.push(new Ore);
        super.Destroy(destroy,save);
    }
    onDestroy(){
        //TODO add mining_pick item
    }
}
class Miner extends Symbols{ //Core
    constructor(){
        super("Miner","images/miner.png",1,0,`Destroys adjacent ${image("ore")} and ${image("big_ore")}. Gives 20 ${image("coin")} for each ${image("ore")} and ${image("big_ore")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Ore","Big Ore"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Ore","Big Ore"],"+20",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Monkey extends Symbols{ //Core
    constructor(){
        super("Monkey","images/monkey.png",1,0,`Destroys adjacent ${image("banana")}, ${image("coconut")}, ${image("coconut_half")}. Gives 6x the value of symbols destroyed this way.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Banana","Coconut","Coconut Half"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Banana","Coconut"],"+1",index,symbolsToShow);
        gets = [...gets,...this.receiveEffectFromAdjacent(["Coconut Half"],"+2",index,symbolsToShow)];
        return [...gives,...gets];
    }
}
class Moon extends Symbols{
    constructor(){
        super("Moon","images/moon.png",3,2,`Adjacent ${image("owl")} ${image("rabbit")} and ${image("wolf")} give 3x more ${image("coin")}. Adds 3 ${image("cheese")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Owl","Rabbit","Wolf"],"*3",index,symbolsToShow);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Cheese);
    }
}
class Mouse extends Symbols{ //Core
    constructor(){
        super("Mouse","images/mouse.png",1,0,`Destroys adjacent ${image("cheese")}. Gives 15 ${image("coin")} for each ${image("cheese")} destroyed.`);
    }
    getEffects(index, symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Cheese"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Cheese"],"+15",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Mrs_Fruit extends Symbols{
    constructor(){
        super("Mrs Fruit","images/mrs_fruit.png",2,2,`Destroys adjacent ${image("banana")} ${image("cherry")} ${image("coconut")} ${image("coconut_half")} ${image("orange")} and ${image("peach")}. Permanently gives 1 ${image("coin")} for each symbol destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Banana","Cherry","Coconut","Coconut Half","Orange","Peach"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Banana","Cherry","Coconut","Coconut Half","Orange","Peach"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Ninja extends Symbols{ //Core
    constructor(){
        super("Ninja","images/ninja.png",2,1,`Gives 1 ${image("coin")} less for each other ${image("ninja")}`);
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAdjacent(["Ninja"],"-1",index,symbolsToShow);
    }
}
class Omelette extends Symbols{ //Core
    constructor(){
        super("Omelette","images/omelette.png",3,2,`Gives 2 ${image("coin")} more if adjacent to ${image("cheese")} ${image("egg")} ${image("milk")} ${image("golden_egg")} or ${image("omelette")}. This effect only applies once per spin.`);
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAdjacent(["Cheese","Egg","Milk","Golden Egg","Omelette"],"+2",index,symbolsToShow);
        return [gets[0]];
    }
}
class Orange extends Symbols{ //Core
    constructor(){
        super("Orange","images/orange.png",1,0);
    }
}
class Ore extends Symbols{ //Core
    constructor(){
        super("Ore","images/ore.png",1,0,`Adds ${image("void_stone")}, ${image("amethyst")}, ${image("pearl")}, ${image("shiny_pebble")}, ${image("sapphire")}, ${image("emerald")}, ${image("ruby")}, or ${image("diamond")} when destroyed.`);
    }
    onDestroy(){
        let rarity = GetRarity();
        let stones = [
            [Pearl, Shiny_Pebble],
            [Void_Stone,Sapphire],
            [Amethyst,Emerald,Ruby],
            [Diamond]
        ][rarity];
        GameState.PlayerSymbols.push(new stones[Math.floor(Math.random() * stones.length)]);
    }
}
class Owl extends Symbols{ //Core
    constructor(){
        super("Owl","images/owl.png",1,0,`Gives 1 ${image("coin")} every 3 spins.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Owl")){
            this.state -= getThreshold("Owl");
            return [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+1")]
        }
        else{
            return [];
        }
    }
}
class Oyster extends Symbols{ //Core
    constructor(){
        super("Oyster","images/oyster.png",1,0,`Has a 20% chance of adding ${image("pearl")}. Adds ${image("pearl")} when removed.`);
        this.willBeRemoved = false;
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.2){
            GameState.PlayerSymbols.push(new Pearl);
        }
        return [];
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if (effects[i].effect == "remove"){
                GameState.PlayerSymbols.push(new Pearl);
                this.willBeRemoved = true;
            }
        }
        return super.getPayout(effects);
    }
    Destroy(destroy,save){
        if(this.willBeRemoved){
            this.remove();
        }else{
            super.Destroy(destroy, save);
        }
    }
}
class Peach extends Symbols{ //Core
    constructor(){
        super("Peach","images/peach.png",2,1,`Adds ${image("seed")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Seed);
    }
}
class Pear extends Symbols{ //Core
    constructor(){
        super("Pear","images/pear.png",1,2,`When another Symbol makes this symbol give more ${image("coin")}, permanently gives 1 more ${image("coin")}.`)
    }
    getPayout(effects){
        let gainedPerm = false;
        for (let i=0; i<effects.length;i++){
            if (effects[i].from > 0 && !gainedPerm){
                this.payout++;
                gainedPerm = false;
            }
        }
        return super.getPayout(effects);
    }
}
class Pearl extends Symbols{ //Core
    constructor(){
        super("Pearl","images/pearl.png",1,0);
    }
}
class Pinata extends Symbols{ //Core
    constructor(){
        super("Piñata","images/pinata.png",1,1,`Adds 7 ${image("candy")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
        GameState.PlayerSymbols.push(new Candy);
    }
}
class Pirate extends Symbols{ //Core
    constructor(){
        super("Pirate","images/pirate.png",2,3,`Destroys adjacent ${image("anchor")} ${image("beer")} ${image("coin")} ${image("lockbox")} ${image("safe")} ${image("orange")} ${image("treasure_chest")} and ${image("mega_chest")}. Permanently gives 1 ${image("coin")} for each symbol destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Anchor","Beer","Coin","Lockbox","Safe","Orange","Treasure Chest","Mega Chest"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Anchor","Beer","Coin","Lockbox","Safe","Orange","Treasure Chest","Mega Chest"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Present extends Symbols{ //Core
    constructor(){
        super("Present","images/present.png",0,0,`Destroys itself after 12 spins. Gives 10 ${image("coin")} when destroyed.`)
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Present")){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
    getPayout(effects){
        if(this.beingDestroyed(effects)){
            this.tempPayout += 10;
        }
        return super.getPayout(effects);
    }
}
class Pufferfish extends Symbols{
    constructor(){
        super("Pufferfish","images/pufferfish.png",2,1,`Gives 1 ${image("reroll_token")} when removed.`)
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if (effects[i].effect == "remove"){
                //TODO add reroll token
                this.willBeRemoved = true;
            }
        }
        return super.getPayout(effects);
    }
    Destroy(destroy,save){
        if(this.willBeRemoved){
            this.remove();
        }else{
            super.Destroy(destroy, save);
        }
    }
}
class Rabbit extends Symbols{
    constructor(){
        super("Rabbit","images/rabbit.png",1,1,`Permanently gives 2 ${image("coin")} more after giving ${image("coin")} 10 times.`)
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if (this.state == 10){
            this.payout = 3;
        }
        return [];
    }
}
class Rabbit_Fluff extends Symbols{
    constructor(){
        super("Rabbit Fluff","images/rabbit_fluff.png",2,1,"You are 1.2x more likely to find Uncommon, Rare, and Very Rare items.");
        GameState.RarityMulti += 1.2;
    }
    onDestroy(){
        GameState.RarityMulti -= 1.2;
    }
}
class Rain extends Symbols{
    constructor(){
        super("Rain","images/rain.png",2,1,`Adjacent ${image("flower")} give 2x more ${image("coin")}. Adjacent ${image("seed")} are 50% more likely to grow.`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Flower"],"*2",index,symbolsToShow);
    }
}
class Removal_Capsule extends Symbols{
    constructor(){
        super("Removal Capsule","images/removal_capsule.png",0,1,`Destroys itself. Gives 1 ${image("removal_token")} when destroyed.`);
    }
    onDestroy(){
        //TODO add removal token item
    }
}
class Reroll_Capsule extends Symbols{
    constructor(){
        super("Reroll Capsule","images/reroll_capsule.png",0,1,`Destroys itself. Gives 1 ${image("reroll_token")} when destroyed.`);
    }
    onDestroy(){
        //TODO add reroll token item
    }
}
class Robin_Hood extends Symbols{
    constructor(){
        super("Robin Hood","images/robin_hood.png",-4,2,`Gives 25 ${image("coin")} every 4 spins. Adjacent ${image("thief")} ${image("bronze_arrow")} ${image("golden_arrow")} and ${image("silver_arrow")} give 3 ${image("coin")} more. Destroys adjacent ${image("billionaire")} ${image("target")} and ${image("apple")}. Gives 15 ${image("coin")} for each ${image("billionaire")} ${image("target")} and ${image("apple")} destroyed.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        let counterAdd = [];
        if(this.state >= getThreshold("Robin Hood")){
            this.state -= getThreshold("Robin Hood")
            counterAdd = [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+25")];
        }
        let gives1 = this.giveEffectToAdjacent(["Thief","Bronze Arrow","Golden Arrow","Silver Arrow"],"+3",index,symbolsToShow);
        let gives2 = this.giveEffectToAdjacent(["Billionaire","Target","Apple"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Billionaire","Target","Apple"],"+15",index,symbolsToShow);
        return [...gives1,...gives2,...gets,...counterAdd];
    }
}
class Ruby extends Symbols{
    constructor(){
        super("Ruby","images/ruby.png",3,2,`Gives 1 ${image("coin")} more if there are at least 2 ${image("ruby")}.`);
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAllSpun(["Ruby"],"+1",index,symbolsToShow);
        if (gets.length >= 2){
            return gets[0];
        }else{
            return [];
        }
    }
}
class Safe extends Symbols{
    constructor(){
        super("Safe","images/safe.png",1,1,`Gives 10 ${image("coin")} when destroyed.`);
        this.state = 10;
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                this.tempPayout += this.state;
                break;
            }
        }
        return super.getPayout(effects);
    }
}
class Sand_Dollar extends Symbols{
    constructor(){
        super("Sand Dollar","images/sand_dollar.png",2,1,`Gives 10 ${image("coin")} when removed.`);
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if (effects[i].effect == "remove"){
                this.payout += 10;
                this.willBeRemoved = true;
            }
        }
        return super.getPayout(effects);
    }
    Destroy(destroy,save){
        if(this.willBeRemoved){
            this.remove();
        }else{
            super.Destroy(destroy, save);
        }
    }
}
class Sapphire extends Symbols{
    constructor(){
        super("Sapphire","images/sapphire.png",2,1);
    }
}
class Seed extends Symbols{
    constructor(){
        super("Seed","images/seed.png",1,0,`Has a 25% chance to grow into ${image("void_fruit")}, ${image("banana")}, ${image("cherry")}, ${image("coconut")}, ${image("flower")}, ${image("pear")}, ${image("orange")}, ${image("peach")}, ${image("apple")}, ${image("strawberry")}, or ${image("watermelon")}.`)
    }
    getEffects(index,symbolsToShow){
        let chance = 0.25;
        //Add checks for other spun symbols or items
        if(Math.random() < chance){
            return this.getSelfDestructEffect();
        }else{
            
            return [];
        }
    }
    onDestroy(){
        let rarity = GetRarity();
        let fruits = [
            [Banana,Cherry,Flower],
            [Void_Fruit,Coconut,Orange,Peach],
            [Pear,Apple,Strawberry],
            [Watermelon]
        ][rarity];
        GameState.PlayerSymbols.push(new fruits[Math.floor(Math.random() * fruits.length)]);
    }
}
class Shiny_Pebble extends Symbols{
    constructor(){
        super("Shiny Pebble","images/shiny_pebble.png",1,0,"You are 1.1x more likely to get Uncommon, Rare, and Very Rare symbols.")
        GameState.RarityMulti += 1.1;
    }
    onDestroy(){
        GameState.RarityMulti -= 1.1;
    }
}
class Silver_Arrow extends Symbols{
    constructor(){
        super("Silver Arrow","images/silver_arrow.png",0,1,`Points in a random direction. Symbols that are pointed to give 3x more ${image("coin")}. Destroys ${image("target")} that are pointed to.`)
    }
    getEffects(index,symbolsToShow){
        //Directions
        // 7 0 1
        // 6 A 2
        // 5 4 3
        let direction = [0,1,2,3,4,5,6,7][Math.floor(Math.random() * 8)];
        this.imageRotation = `${direction * 45}deg`
        let gives = []; let curInd = index;
        while(getNextPoint(curInd, direction) !== false){
            curInd = getNextPoint(curInd,direction);
            let sym = symbolsToShow[curInd];
            if (GameState.PlayerSymbols[sym].name == "Target"){
                gives.push(CreateEffect(sym,symbolsToShow[index],"destroy"));
            }
            gives.push(CreateEffect(sym,symbolsToShow[index],"*3"));
        }
        return gives;
    }
}
class Sloth extends Symbols{
    constructor(){
        super("Sloth","images/sloth.png",0,0,`Gives 4 ${image("coin")} every 2 spins.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Sloth")){
            this.state -= getThreshold("Sloth");
            return [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+4")]
        }else{
            return [];
        }
    }
}
class Snail extends Symbols{
    constructor(){
        super("Snail","images/snail.png",0,0,`Gives 5 ${image("coin")} every 4 spins.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Snail")){
            this.state -= getThreshold("Snail");
            return [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+5")]
        }else{
            return [];
        }
    }
}
class Spades extends Symbols{
    constructor(){
        super("Spades","images/spades.png",1,1,`Adjacent ${image("spades")} and ${image("clubs")} give 1 more ${image("coin")}. Gives 1 more ${image("coin")} if there are at least 3 ${image("clubs")} ${image("diamonds")} ${image("hearts")} or ${image("spades")}.`);
    }
    getEffects(index,symbolsToShow){
        //If next to a card shark, becomes a wildcard.
        this.state = false;
        return [];
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Clubs","Spades"],"+1",index,symbolsToShow);
        let gets = this.receiveEffectFromAllSpun(["Clubs","Spades","Hearts","Diamonds"],"+1",index,symbolsToShow);
        if(gets.length >= 2){ //Itself counts as one of the symbols, so two more is a payout
            gives.push(gets[0]);
        }
        let isWild = this.receiveEffectFromAdjacent(["Card Shark"],"Wild",index,symbolsToShow);
        if (isWild.length > 0){
            this.state = true;
        }
        return gives;
    }
    getPayout(effects){
        if(!this.state){
            //Normal operation
            return super.getPayout(effects);
        }else{
            return 0;
        }
    }
    finalize(index,symbolsToShow){
        if(this.state){
            //Acting as a wildcard
            let neighbors = GetAdjacentIndices(index);
            let maxPayout = -100000; //Probably the lowest payout that can be had
            for (let i=0; i<neighbors.length; i++){
                if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name == "Wildcard"){continue;}
                else if(["Clubs","Spades","Diamonds","Hearts","Cat"].indexOf(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name) > -1){
                    //All 5 of these symbols have no other state, so just check for state=true to signify wildcard-like
                    if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].state){continue;}
                    else{
                        maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout)
                    }
                }else{
                    maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout)
                }
            }
            this.lastPayout = (maxPayout + this.tempPayout) * this.tempMulti;
            this.tempPayout = 0;
            this.tempMulti = 1;
            return this.lastPayout;
        }else{
            //Not acting as a wildcard
            return 0;
        }
    }
}
class Spirit extends Symbols{
    constructor(){
        super("Spirit","images/spirit.png",6,2,`Destroys itself after giving ${image("coin")} 4 times.`)
        this.state = 4;
    }
    getEffects(index,symbolsToShow){
        this.state--;
        if(this.state == 0){
            return this.getSelfDestructEffect();
        }else{
            return [];
        }
    }
}
class Strawberry extends Symbols{
    constructor(){
        super("Strawberry","images/strawberry.png",3,2,`Gives 1 ${image("coin")} more if there are at least 2 ${image("strawberry")}.`);
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAllSpun(["Strawberry"],"+1",index,symbolsToShow);
        if (gets.length >= 2){
            return gets[0];
        }else{
            return [];
        }
    }
}
class Sun extends Symbols{
    constructor(){
        super("Sun","images/sun.png",3,2,`Adjacent ${image("flower")} give 5x more ${image("coin")}. Adjacent ${image("seed")} are 50% more likely to grow.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Flower"],"*5",index,symbolsToShow);
        return gives;
    }
}
class Target extends Symbols{
    constructor(){
        super("Target","images/target.png",2,1,`Gives 10 ${image("coin")} when destroyed.`);
    }
    getPayout(effects){
        let isdestroying = false;
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                isdestroying = true;
            }
        }
        if(isdestroying){
            this.tempPayout += 10;
        }
        return super.getPayout(effects);
    }
}
class Tedium_Capsule extends Symbols{
    constructor(){
        super("Tedium Capsule","images/tedium_capsule.png",0,1,`Destroys itself. Gives 5 ${image("coin")} when destroyed. At least one of the next symbols to add will be of Common rarity.`);
    }
    getEffects(index,symbolsToShow){
        return [...this.getSelfDestructEffect(),{
            "to":this.index,
            "from":this.index,
            "effect":"+5"
        }];
    }
    onDestroy(){
        GameState.ForcedRarities.push("Common");
    }
}
class Tester extends Symbols{ //Core
    constructor(){
        super("Tester","images/tester.png",100000,4)
    }
    getEffects(index,symbolsToShow){GameState.HasTester = true;return [];}
}
class Thief extends Symbols{
    constructor(){
        super("Thief","images/thief.png",-1,1,`Gives ? ${image("coin")} when destroyed. ? increases by 4 each spin.`)
        //If thief is buffed when destroyed, the payout is also buffed. Probably won't matter, but it might.
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state += 4;
        return [];
    }
    getPayout(effects){ 
        if(this.beingDestroyed(effects)){
            this.tempPayout += this.state;
        }
        return super.getPayout(effects);
    }
}
class Three_Sided_Die extends Symbols{
    constructor(){
        super("Three Sided Die","images/three_sided_die.png",0,1,`Pays between 1 Coin and 5 ${image("coin")} randomly.`)
    }
    getEffects(){
        let payout = [1,2,3][Math.floor(Math.random()*3)];
        return [{
            "to":GameState.PlayerSymbols.indexOf(this),
            "from":GameState.PlayerSymbols.indexOf(this),
            "effect":`+${payout}`
        }]
    }
}
class Time_Capsule extends Symbols{
    constructor(){
        super("Time Capsule","images/time_capsule.png",0,1,"Destroys itself. Adds a base version 1 Symbol that was destroyed this game when destroyed.");
    }
    getEffects(index,symbolsToShow){
        return this.getSelfDestructEffect();
    }
    onDestroy(){
        if(Object.keys(GameState.Destroyed) != ["Empty"]){ //You must have destroyed something to get something back. Empty does not count
            let choices = Object.keys(GameState.Destroyed);
            let choice = Math.floor(Math.random() * choices.length);
            while (["Empty","Highlander"].indexOf(Object.keys(GameState.Destroyed)[choice]) > -1){
                //If we find illegal symbols to add
                if (Object.keys(GameState.Destroyed)[choice] == "Highlander"){
                    let hasHighlander = false;
                    for (let i=0; i<GameState.PlayerSymbols.length; i++){
                        if (GameState.PlayerSymbols[i].name == "Highlander"){
                            hasHighlander = true;
                        }
                    }
                    if (!hasHighlander){break;}//No need to get a new symbol, the player does not have a highlander. Give them the one that was destroyed
                }
                choice = Math.floor(Math.random() * choices.length);
            }
            GameState.PlayerSymbols.push(eval(`new ${Object.keys(GameState.Destroyed)[choice].replace(" ","_")}`));
        }
    }
}
class Toddler extends Symbols{
    constructor(){
        super("Toddler","images/toddler.png",1,0,`Destroys adjacent ${image("present")},${image("candy")},${image("pinata")},and ${image("bubble")}. Gives 6 ${image("coin")} for each ${image("present")}, ${image("candy")}, ${image("pinata")}, and ${image("bubble")} destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Present","Candy","Piñata","Bubble"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Present","Candy","Piñata","Bubble"],"+6",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Tomb extends Symbols{
    constructor(){
        super("Tomb","images/tomb.png",3,2,`Has a 6% chance of adding ${image("spirit")}. Adds 4 ${image("spirit")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.06){
            GameState.PlayerSymbols.push(new Spirit);
        }
        return [];
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Spirit);
        GameState.PlayerSymbols.push(new Spirit);
        GameState.PlayerSymbols.push(new Spirit);
        GameState.PlayerSymbols.push(new Spirit);
    }
}
class Treasure_Chest extends Symbols{
    constructor(){
        super("Treasure Chest","images/treasure_chest.png",2,2,`Gives 50 ${image("coin")} when destroyed.`);
        this.state = 50;
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect == "destroy"){
                this.tempPayout += this.state;
                break;
            }
        }
        return super.getPayout(effects);
    }
}
class Turtle extends Symbols{
    constructor(){
        super("Turtle","images/turtle.png",0,0,`Gives 4 ${image("coin")} every 3 spins.`);
        this.state = 0;
    }
    getEffects(index,symbolsToShow){
        this.state++;
        if(this.state >= getThreshold("Turtle")){
            this.state -= getThreshold("Turtle");
            return [CreateEffect(GameState.PlayerSymbols.indexOf(this),GameState.PlayerSymbols.indexOf(this),"+4")]
        }
        else{
            return [];
        }
    }
}
class Urn extends Symbols{
    constructor(){
        super("Urn","images/urn.png",1,0,`Gives ${image("spirit")} when destroyed.`);
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Spirit);
    }
}
class Void_Creature extends Symbols{
    constructor(){
        super("Void Creature","images/void_creature.png",0,1,`Adjacent ${image("empty")} give 1 more ${image("coin")}. Destroys itself if adjacent to 0 ${image("empty")}. Gives 8 ${image("coin")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Empty"],"+1",index,symbolsToShow);
        if(gives.length == 0){
            gives.push(...this.getSelfDestructEffect());
            gives.push({
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"+8"
            })
        }
        return gives;
    }
}
class Void_Fruit extends Symbols{
    constructor(){
        super("Void Fruit","images/void_fruit.png",0,1,`Adjacent ${image("empty")} give 1 more ${image("coin")}. Destroys itself if adjacent to 0 ${image("empty")}. Gives 8 ${image("coin")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Empty"],"+1",index,symbolsToShow);
        if(gives.length == 0){
            gives.push(...this.getSelfDestructEffect());
            gives.push({
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"+8"
            })
        }
        return gives;
    }
}
class Void_Stone extends Symbols{
    constructor(){
        super("Void Stone","images/void_stone.png",0,1,`Adjacent ${image("empty")} give 1 more ${image("coin")}. Destroys itself if adjacent to 0 ${image("empty")}. Gives 8 ${image("coin")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Empty"],"+1",index,symbolsToShow);
        if(gives.length == 0){
            gives.push(...this.getSelfDestructEffect());
            gives.push({
                "to":GameState.PlayerSymbols.indexOf(this),
                "from":GameState.PlayerSymbols.indexOf(this),
                "effect":"+8"
            })
        }
        return gives;
    }
}
class Watermelon extends Symbols{
    constructor(){
        super("Watermelon","images/watermelon.png",4,3,`Gives 1 ${image("coin")} more for each other ${image("watermelon")}.`);
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAllSpun(["Watermelon"],"+1",index,symbolsToShow);
    }
}
class Wealthy_Capsule extends Symbols{
    constructor(){
        super("Wealthy Capsule", "images/wealthy_capsule.png",0,1,`Destroys itself, gives 10 ${image("coin")} when destroyed.`);
    }
    getEffects(index,symbolsToShow){
        let get = this.getSelfDestructEffect();
        return [...get,{
            "to":this.index,
            "from":this.index,
            "effect":"+10"
        }]
    }
}
class Wildcard extends Symbols{
    constructor(){
        super("Wildcard","images/wildcard.png",0,3,`Gives ${image("coin")} equal to the highest value among adjacent symbols.`);
    }
    getEffects(index,symbolsToShow){
        this.lastPayout = 0; //Shouldn't matter, but do it anyway
        return [];
    }
    getPayout(effects){
        for (let i=0; i<effects.length; i++){
            if(effects[i].effect.indexOf("forever") > -1){
                this.payout += parseInt(effects[i].effect);
            }else if(effects[i].effect.indexOf("+") > -1 || effects[i].effect.indexOf("-") == 0){ //Only looking for '-n' not '*-n'
                this.tempPayout += parseInt(effects[i].effect);
            }else if(effects[i].effect.indexOf("*") > -1){ //temp multi
                this.tempMulti *= parseInt(effects[i].effect.split("*")[1]);
            }//else it's a "save" or "destroy"
        }
        return 0; //Return nothing at first, then return a real value when finalized.
    }
    finalize(index,symbolsToShow){
        let neighbors = GetAdjacentIndices(index);
        let maxPayout = -100000; //Probably the lowest payout that can be had
        for (let i=0; i<neighbors.length; i++){
            if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name == "Wildcard"){continue;}
            else if(["Clubs","Spades","Diamonds","Hearts","Cat"].indexOf(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].name) > -1){
                //All 5 of these symbols have no other state, so just check for state=true to signify wildcard-like
                if(GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].state){continue;}
                else{
                    maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout);
                }
            }else{
                maxPayout = Math.max(maxPayout, GameState.PlayerSymbols[symbolsToShow[neighbors[i]]].lastPayout);
            }
        }
        this.lastPayout = (maxPayout + this.tempPayout) * this.tempMulti;
        this.tempPayout = 0;
        this.tempMulti = 1;
        return this.lastPayout;
    }
}
class Wine extends Symbols{ //Core
    constructor(){
        super("Wine","images/wine.png",2,1,`Permanently gives +1 ${image("coin")} after giving coins 8 times.`);
        this.state = 0;
    }
    getPayout(effects){
        this.state++;
        if(this.state == 8){
            this.payout++;
        }
        return super.getPayout(effects);
    }
}
class Witch extends Symbols{
    constructor(){
        super("Witch","images/witch.png",2,2,`Adjacent ${image("cat")}, ${image("owl")}, ${image("crow")}, ${image("apple")}, ${image("hex_of_destruction")}, ${image("hex_of_draining")}, ${image("hex_of_emptiness")}, ${image("hex_of_hoarding")}, ${image("hex_of_midas")}, ${image("hex_of_tedium")}, ${image("hex_of_thievery")}, ${image("eldritch_creature")}, and ${image("spirit")} give 2x more ${image("coin")}.`);
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(
            [
                "Cat",
                "Owl",
                "Crow",
                "Apple",
                "Hex of Destruction",
                "Hex of Draining",
                "Hex of Emptiness",
                "Hex of Hoarding",
                "Hex of Midas",
                "Hex of Tedium",
                "Hex of Thievery",
                "Eldritch Creature",
                "Spirit"
            ],"*2",index,symbolsToShow);
    }
}
class Wolf extends Symbols{ //Core
    constructor(){
        super("Wolf","images/wolf.png",2,1);
    }
}