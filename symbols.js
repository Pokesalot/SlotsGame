class Symbols {
    constructor(name, src, payout, rarity, description = ""){
        this.name = name;
        this.src = src;
        
        this.rarity = rarity; //Common = 0; Uncommon = 1; Rare = 2; Very Rare = 3; Special = 4;
        this.state = 0;
        this.description = description;

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
        for (let i = 0; i<15; i++){
            if(index != i && (nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[i]].name) > -1 || nameArr == "*")){
                effects.push( CreateEffect( symbolsToShow[i], GameState.PlayerSymbols.indexOf(this), effect ) );
            }
        }
        return effects;
    }
    receiveEffectFromAllSpun(nameArr,effect,index,symbolsToShow){
        let effects = [];
        for (let i = 0; i<15; i++){
            if(index != i && (nameArr.indexOf( GameState.PlayerSymbols[symbolsToShow[i]].name) > -1 || nameArr == "*")){
                effects.push( CreateEffect( GameState.PlayerSymbols.indexOf(this), symbolsToShow[i], effect ) );
            }
        }
        return effects;
    }
}

class Amethyst extends Symbols{ //Core
    constructor(){
        super("Amethyst","images/amethyst.png",1,2,"When another Symbol makes this symbol give more gold, permanently gives 1 more gold.")
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
        super("Anchor","images/anchor.png",1,0,"Gives 4 more coins when in a corner.");
    }
    getEffects(index, symbolsToShow){
        if([0,2,12,14].indexOf(index)!=-1){
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
        super("Banana","images/banana.png",1,0,"Adds a Banana Peel when destroyed.");
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Banana_Peel);
    }
}
class Banana_Peel extends Symbols{ //Core
    constructor(){
        super("Banana Peel","images/banana_peel.png",1,0,"Destroys adjacent Thief. Destroys itself after.")
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
        super("Bar of Soap","images/bar_of_soap.png",1,1,"Gives Bubble each spin. Destroys itself after giving coins 3 times.");
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
        super("Bartender","images/bartender.png",3,2,"Has a 10% chance to add Beer, Wine, Martini, or Chemical Seven");
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.1){
            let drinks = [
                [Beer],
                [Chemical_Seven,Wine],
                [Martini]
            ][GetRarity()];
            GameState.PlayerSymbols.push(new drinks[Math.floor(Math.random() * drinks.length)]);
        }
        return [];
    }
}
class Bear extends Symbols{ //Core
    constructor(){
        super("Bear","images/bear.png",2,1,"Destroys adjacent Honey, gives 40 coins for each Honey destroyed.")
    }
    getEffects(index, symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Honey"], "destroy", index, symbolsToShow);
        let gets  = this.receiveEffectFromAdjacent(["Honey"], "+40", index, symbolsToShow);
        return [...gives,...gets]
    }
}
class Beastmaster extends Symbols{ //Core
    constructor(){
        super("Beastmaster","images/beastmaster.png",2,2,"Adjacent Magpie Void_Creature Turtle Snail Sloth Oyster Owl Mouse Monkey Rabbit Goose Goldfish Dog Crab Chick Cat Bee Sand_Dollar Wolf Pufferfish Jellyfish Dove Crow Chicken Bear Cow and Eldritch_Creature give 2x more Coin.")
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(
            [
                "Magpie",
                "Void_Creature",
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
                "Sand_Dollar",
                "Wolf",
                "Pufferfish",
                "Jellyfish",
                "Dove",
                "Crow",
                "Chicken",
                "Bear",
                "Cow",
                "Eldritch_Creature"
            ], "*2",index,symbolsToShow
        );
    }
}
class Bee extends Symbols{ //Core
    constructor(){
        super("Bee","images/bee.png",1,0,"Adjacent Flower and Beehive give 2x coin. Gives 1 more coin for each adjacent Flower, Beehive, or Honey.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Flower","Beehive"],"*2",index,symbolsToShow);
        let gets  = this.receiveEffectFromAdjacent(["Flower","Beehive","Honey"], "+1", index, symbolsToShow)
        return [...gives,...gets];
    }
}
class Beehive extends Symbols{ //Core
    constructor(){
        super("Beehive","images/beehive.png",3,2,"Has a 10% chance of adding Honey each spin.");
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
        super("Big Ore","images/big_ore.png",1,0,"Adds 2 Void_Stone, Amethyst, Pearl, Shiny_Pebble, Sapphire, Emerald, Ruby, or Diamond when destroyed.")
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
        super("Big Urn","images/big_urn.png",2,1,"Adds 2 Spirit when destroyed.");
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Spirit);
        GameState.PlayerSymbols.push(new Spirit);
    }
}
class Billionaire extends Symbols{ //Core
    constructor(){
        super("Billionaire","images/billionaire.png",0,1,"Adjacent Cheese and Wine give 2x more. Gives 39 Coins when destroyed.");
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
        super("Bounty Hunter","images/bounty_hunter.png",1,0,"Destroys adjacent Thief. Gives 20 Coins for each Thief destroyed.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Thief"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Thief"],"+20",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Bubble extends Symbols{ //Core
    constructor(){
        super("Bubble","images/bubble.png",2,0,"Destroys itself after giving coins 3 times.");
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
        super("Buffing Capsule","images/buffing_capsule.png",0,1,"Destroys itself. Adjacent symbols give 2x more Coins.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent("*","*2",index,symbolsToShow);
        return [...gives,this.getSelfDestructEffect()];
    }
}
class Card_Shark extends Symbols{ //Core
    //Adjacent Clubs Diamonds Hearts and Spades are Wildcard
    constructor(){
        super("Card Shark","images/card_shark.png",2,2,"Adjacecent Clubs, Diamonds, Hearts, Spades are Wildcard.");
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
        super("Cat","images/cat.png",1,0,"Destroys adjacent Milk. Gives 9 Coins for each Milk destroyed.")
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
//TODO add Lucky_Seven Item
class Chemical_Seven extends Symbols{
    constructor(){
        super("Chemical Seven","images/chemical_seven.png",0,1,"Destroys itself. Gives 7 Coins and Lucky_Seven when destroyed.");
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
        super("Chick","images/chick.png",1,1,"Has a 10% chance of growing into Chicken.");
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
        super("Chicken","images/chicken.png",2,2,"Has a 5% chance of adding Egg. Has a 1% chance of adding Golden_Egg");
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
        super("Clubs","images/clubs.png",1,1,"Adjacent Clubs and Spades give 1 more Coin. Gives 1 more Coin if there are at least 3 Clubs Hearts Diamonds or Spades.");
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
        super("Coal","images/coal.png",0,0,"Transforms into Diamond after 20 spins.")
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
        super("Coconut","images/coconut.png",1,2,"Adds two Coconut_Half when destroyed.");
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
class Cow extends Symbols{ //Core
    constructor(){
        super("Cow","images/cow.png",3,2,"Has a 15% chance to add Milk.");
    }
    getEffects(index,symbolsToShow){
        if (Math.random() < 0.15){
            GameState.PlayerSymbols.push(new Milk);
        }
        return [];
    }
}
class Crow extends Symbols{ //Core
    constructor(){
        super("Crow","images/crow.png",2,0,"Gives -3 Coins every 4 spins.");
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
        super("Cultist","images/cultist.png",0,0,"Gives 1 Coin more for each other Cultist. Gives 1 more if there are at least three Cultist.");
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
        super("Dame","images/dame.png",2,2,"Adjacent Void_Stone, Amethyst, Pearl, Shiny_Pebble, Sapphire, Emerald, Ruby, and Diamond give 2x more Coins. Destroys adjacent Martini. Gives 40 Coins for each Martini destroyed.");
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
        super("Diamond","images/diamond.png",5,3,"Gives 1 coin more for each other Diamond.");
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAllSpun(["Diamond"],"+1",index,symbolsToShow);
    }
}
class Diamonds extends Symbols{
    constructor(){
        super("Diamonds","images/diamonds.png",1,1,"Adjacent Hearts and Diamonds give 1 more Coin. Gives 1 more Coin if there are at least 3 Clubs Hearts Diamonds or Spades.");
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
class Dog extends Symbols{
    constructor(){
        super("Dog","images/dog.png",1,0,"Gives Coin 1 more if adjacent to Robin Hood Thief Cultist Toddler Bounty Hunter Miner Dwarf King Midas Gambler General Zaroff Witch Pirate Ninja Mrs. Fruit Hooligan Farmer Diver Dame Chef Card Shark Beastmaster Geologist Joker Comedian or Bartender")
    }
    getEffects(index, symbolsToShow){
        let gets = this.receiveEffectFromAdjacent(["Robin Hood","Thief","Cultist","Toddler","Bounty Hunter","Miner","Dwarf","King Midas","Gambler","General Zaroff","Witch","Pirate","Ninja","Mrs Fruit","Hooligan","Farmer","Diver","Dame","Chef","Card Shark","Beastmaster","Geologist","Joker","Comedian","Bartender"],"+1",index,symbolsToShow);
        return [gets[0]];
    }
}
class Dud extends Symbols{ //Core
    constructor(spins){
        super("Dud","images/dud.png",0,4);
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
        super("Dwarf","images/dwarf.png",1,0,"Destroys adjacent Beer and Wine. Gives Coin equal to 10x the value of symbols destroyed this way.");
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
        super("Egg","images/egg.png",1,0,"Has a 10% chance to transform into a Chick.");
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
        super("Eldritch Creature","images/eldritch_creature.png",4,3,"Destroys adjacent Cultist, Witch, Hex_of_Destruction, Hex_of_Draining, Hex_of_Emptiness, Hex_of_Hoarding, Hex_of_Midas, Hex_of_Tedium, and Hex_of_Thievery. Gives Coin 1 for each Cultist, Witch, Hex_of_Destruction, Hex_of_Draining, Hex_of_Emptiness, Hex_of_Hoarding, Hex_of_Midas, Hex_of_Tedium, and Hex_of_Thievery destroyed or removed this game")
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
            if ( Object.keys(GameState.Destroyed).indexOf([checks[i]])>-1){
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
        super("Emerald","images/emerald.png",3,2,"Gives 1 Coin more if there are at least 2 Emerald.");
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
        super("Empty","images/empty.png",0,4)
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
class Farmer extends Symbols{
    constructor(){
        super("Farmer","images/farmer.png",2,2,"Adjacent Void Fruit Banana Cheese Cherry Chick Coconut Seed Egg Flower Milk Pear Chicken Orange Peach Strawberry Golden Egg Cow Apple and Watermelon give 2x more Coin. Adjacent Seed are 50% more likely to grow.")
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Void Fruit","Banana","Cheese","Cherry","Chick","Coconut","Seed","Egg","Flower","Milk","Pear","Chicken","Orange","Peach","Strawberry","Golden Egg","Cow","Apple","Watermelon"],"*2",index,symbolsToShow);
    }
}
class Five_Sided_Die extends Symbols{
    constructor(){
        super("Five Sided Die","images/five_sided_die.png",0,1,"Pays between 1 Coin and 5 Coins randomly.")
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
//TODO ask ben
class Gambler extends Symbols{
    constructor(){
        super("Gambler","images/gambler.png",1,0,"Gives Coin ? when destroyed where ? increases by Coin 2 each spin. Destroys itself when Five-Sided Die or Three-Sided Die rolls 1.");
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
        super("General Zaroff","images/general_zaroff.png",1,2,"Destroys adjacent Robin Hood Thief Billionaire Cultist Toddler Bounty Hunter Miner Dwarf King Midas Gambler General Zaroff Witch Pirate Ninja Mrs. Fruit Hooligan Farmer Diver Dame Chef Card Shark Beastmaster Geologist Joker Comedian and Bartender. Gives Coin 20 for each symbol destroyed.");
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
        super("Geologist","images/geologist.png",2,2,"Destroys adjacent Ore Pearl Shiny Pebble Big Ore and Sapphire. Permanently gives Coin 1 for each symbol destroyed.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Ore","Pearl","Shiny Pebble","Big Ore","Sapphire"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Ore","Pearl","Shiny Pebble","Big Ore","Sapphire"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Goldfish extends Symbols{
    constructor(){
        super("Goldfish","images/goldfish.png",1,0,"Destroys adjacent Bubble. Gives Coin 15 for each Bubble destroyed.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Bubble"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Bubble"],"+15",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Golem extends Symbols{
    constructor(){
        super("Golem","images/golem.png",0,1,"Destroys itself after 5 spins. Adds 5 Ore when destroyed.");
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
class Golden_Egg extends Symbols{ //Core
    constructor(){
        super("Golden Egg","images/golden_egg.png",4,2);
    }
}
class Goose extends Symbols{
    constructor(){
        super("Goose","images/goose.png",1,0,"Has a 1% chance of adding Golden_Egg");
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
        super("Hearts","images/hearts.png",1,1,"Adjacent Hearts and Diamonds give 1 more Coin. Gives 1 more Coin if there are at least 3 Clubs Hearts Diamonds or Spades.");
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
        super("Hooligan","images/hooligan.png",2,1,"Destroys adjacent Urn Big Urn and Tomb. Gives Coin 6 for each Urn Big Urn and Tomb destroyed.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Urn","Big Urn","Tomb"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Urn","Big Urn","Tomb"],"+6",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Hustling_Capsule extends Symbols{
    constructor(){
        super("Hustling Capsule","images/hustling_capsule.png",0,1,"Destroys itself. Adds 1 Pool_Ball when destroyed.")
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
        super("Jellyfish","images/jellyfish.png",2,1,"Gives 1 Removal Token when removed.");
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAdjacent(["Diver"],"+0",index,symbolsToShow);
        if(gets.length > 0){
            //Being removed
            //TODO add removal token
        }
    }
}
class Joker extends Symbols{
    constructor(){
        super("Joker","images/joker.png",3,2,"Adjacent Clubs Diamonds Hearts and Spades give 2x more Coin.")
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Clubs","Spades","Hearts","Diamonds"],"*2",index,symbolsToShow);
    }
}
class Key extends Symbols{
    constructor(){
        super("Key","images/key.png",1,0,"Destroys adjacent Lockbox Safe Treasure Chest and Mega Chest. Destroys itself afterward.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Lockbox","Safe","Treasure Chest","Mega Chest"],"destroy",index,symbolsToShow);
        let gets = this.getSelfDestructEffect();
        return [...gives,...gets];
    }
}
class King_Midas extends Symbols{
    constructor(){
        super("King Midas","images/king_midas.png",1,2,"Gives Coin every spin. Adjacent Coins give 3x more Coin.");
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
        super("Lightbulb","images/lightbulb.png",1,0,"Adjacent Void Stone Amethyst Pearl Shiny Pebble Sapphire Emerald Ruby and Diamond give 2x more Coin. Destroys itself after making other symbols give additional Coin 5 times.")
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
        super("Lockbox","images/lockbox.png",1,0,"Gives 15 Coins when destroyed.");
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
        super("Magic Key","images/magic_key.png",2,2,"Destroys adjacent Lockbox Safe Treasure Chest and Mega Chest. Symbols destroyed this way give 3x more Coin. Destroys itself afterward.")
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
        super("Magpie","images/magpie.png",-1,0,"Gives 9 Coins every 4 spins.");
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
        super("Matryoshka Doll","images/matryoshka_1.png",0,1,"Destroys itself after 3 spins. Adds Matryoshka_Doll_2 when destroyed.");
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
        super("Matryoshka Doll 2","images/matryoshka_2.png",1,4,"Destroys itself after 5 spins. Adds Matryoshka_Doll_3 when destroyed.");
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
        super("Matryoshka Doll 3","images/matryoshka_3.png",2,4,"Destroys itself after 7 spins. Adds Matryoshka_Doll_4 when destroyed.");
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
        super("Matryoshka Doll 4","images/matryoshka_4.png",3,4,"Destroys itself after 9 spins. Adds Matryoshka_Doll_5 when destroyed.");
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
        super("Mega Chest","images/mega_chest.png",3,3,"Gives 100 Coins when destroyed.")
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
class Mine extends Symbols{ //Core
    constructor(){
        super("Mine","images/mine.png",4,3,"Adds Ore each spin. Destroys itself after giving Coins 4 times. Adds 1 Mining_Pick when destroyed.");
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
        super("Miner","images/miner.png",1,0,"Destroys adjacent Ore and Big_Ore. Gives 20 Coins for each Ore and Big_Ore destroyed.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Ore","Big Ore"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Ore","Big Ore"],"+20",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Monkey extends Symbols{ //Core
    constructor(){
        super("Monkey","images/monkey.png",1,0,"Destroys adjacent Banana, Coconut, Coconut_Half. Gives 6x the value of symbols destroyed this way.");
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
        super("Moon","images/moon.png",3,2,"Adjacent Owl Rabbit and Wolf give 3x more Coin. Adds 3 Cheese when destroyed.");
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
        super("Mouse","images/mouse.png",1,0,"Destroys adjacent Cheese. Gives 15 Coins for each Cheese destroyed.");
    }
    getEffects(index, symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Cheese"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Cheese"],"+15",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Mrs_Fruit extends Symbols{
    constructor(){
        super("Mrs Fruit","images/mrs_fruit.png",2,2,"Destroys adjacent Banana Cherry Coconut Coconut Half Orange and Peach. Permanently gives Coin 1 for each symbol destroyed.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Banana","Cherry","Coconut","Coconut Half","Orange","Peach"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Banana","Cherry","Coconut","Coconut Half","Orange","Peach"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Ninja extends Symbols{ //Core
    constructor(){
        super("Ninja","images/ninja.png",2,1,"Gives 1 Coin less for each other Ninja");
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAdjacent(["Ninja"],"-1",index,symbolsToShow);
    }
}
class Omelette extends Symbols{ //Core
    constructor(){
        super("Omelette","images/omelette.png",3,2,"Gives Coin 2 more if adjacent to Cheese Egg Milk Golden Egg or Omelette. This effect only applies once per spin.")
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
        super("Ore","images/ore.png",1,0,"Adds Void_Stone, Amethyst, Pearl, Shiny_Pebble, Sapphire, Emerald, Ruby, or Diamond when destroyed.")
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
        super("Owl","images/owl.png",1,0,"Gives 1 Coin every 3 spins.");
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
        super("Oyster","images/oyster.png",1,0,"Has a 20% chance of adding Pearl. Adds Pearl when removed.")
    }
    getEffects(index,symbolsToShow){
        if(Math.random() < 0.2){
            GameState.PlayerSymbols.push(new Pearl);
        }
        let gets = this.receiveEffectFromAdjacent(["Diver"],"+0",index,symbolsToShow);
        if(gets.length){ //If this will be removed, no matter by how many divers, it only adds one pearl.
            GameState.PlayerSymbols.push(new Pearl);
        }
        return [];
    }
}
class Peach extends Symbols{ //Core
    constructor(){
        super("Peach","images/peach.png",2,1,"Adds Seed when destroyed.");
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Seed);
    }
}
class Pear extends Symbols{ //Core
    constructor(){
        super("Pear","images/pear.png",1,2,"When another Symbol makes this symbol give more gold, permanently gives 1 more gold.")
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
        super("Piñata","images/pinata.png",1,1,"Adds 7 Candy when destroyed.");
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
        super("Pirate","images/pirate.png",2,3,"Destroys adjacent Anchor Beer Coin Lockbox Safe Orange Treasure Chest and Mega Chest. Permanently gives Coin 1 for each symbol destroyed.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Anchor","Beer","Coin","Lockbox","Safe","Orange","Treasure Chest","Mega Chest"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Anchor","Beer","Coin","Lockbox","Safe","Orange","Treasure Chest","Mega Chest"],"+1 forever",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Present extends Symbols{ //Core
    constructor(){
        super("Present","images/present.png",0,0,"Destroys itself after 12 spins. Gives 10 Coins when destroyed.")
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
        super("Pufferfish","images/pufferfish.png",2,1,"Gives 1 Reroll Token when removed.")
    }
    onDestroy(){
        //TODO add reroll token
    }
}
class Rabbit extends Symbols{
    constructor(){
        super("Rabbit","images/rabbit.png",1,1,"Permanently gives 2 Coins more after giving Coins 10 times.")
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
        super("Rain","images/rain.png",2,1,"Adjacent Flowers give 2x more. Adjacent Seeds are 50% more likely to grow.");
    }
    getEffects(index,symbolsToShow){
        return this.giveEffectToAdjacent(["Flower"],"*2",index,symbolsToShow);
    }
}
class Removal_Capsule extends Symbols{
    constructor(){
        super("Removal Capsule","images/removal_capsule.png",0,1,"Destroys itself. Gives 1 Removal Token when destroyed.");
    }
    onDestroy(){
        //TODO add removal token item
    }
}
class Reroll_Capsule extends Symbols{
    constructor(){
        super("Reroll Capsule","images/reroll_capsule.png",0,1,"Destroys itself. Gives 1 Reroll Token when destroyed.");
    }
    onDestroy(){
        //TODO add reroll token item
    }
}
class Robin_Hood extends Symbols{
    constructor(){
        super("Robin Hood","images/robin_hood.png",-4,2,"Gives Coin 25 every 4 spins. Adjacent Thief Bronze Arrow Golden Arrow and Silver Arrow give Coin 3 more. Destroys adjacent Billionaire Target and Apple. Gives Coin 15 for each Billionaire Target and Apple destroyed.");
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
        super("Ruby","images/ruby.png",3,2,"Gives 1 Coin more if there are at least 2 Ruby.");
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
        super("Safe","images/safe.png",1,1,"Gives 10 Coins when destroyed.");
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
        super("Sand Dollar","images/sand_dollar.png",2,1,"Gives 10 Coins when removed.");
    }
    getEffects(index,symbolsToShow){
        let gets = this.receiveEffectFromAdjacent(["Diver"],"+10",index,symbolsToShow);
        return [gets[0]];
    }
}
class Sapphire extends Symbols{
    constructor(){
        super("Sapphire","images/sapphire.png",2,1);
    }
}
//TODO check other symbols/items for grow chance changes, add to getEffects();
class Seed extends Symbols{
    constructor(){
        super("Seed","images/seed.png",1,0,"Has a 25% chance to grow into Void Fruit, Banana, Cherry, Coconut, Flower, Pear, Orange, Peach, Apple, Strawberry, or Watermelon.")
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
//TODO ask Ben
class Sloth extends Symbols{
    constructor(){
        super("Sloth","images/sloth.png",0,0,"Gives 4 Coins every 2 spins.");
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
//TODO ask Ben
class Snail extends Symbols{
    constructor(){
        super("Snail","images/snail.png",0,0,"Gives 5 Coins every 4 spins.");
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
        super("Spades","images/spades.png",1,1,"Adjacent Clubs and Spades give 1 more Coin. Gives 1 more Coin if there are at least 3 Clubs Hearts Diamonds or Spades.");
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
        super("Spirit","images/spirit.png",6,2,"Destroys itself after giving Coins 4 times.")
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
        super("Strawberry","images/strawberry.png",3,2,"Gives 1 Coin more if there are at least 2 Strawberry.");
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
        super("Sun","images/sun.png",3,2,"Adjacent Flowers give 5x more Coins. Adjacent Seeds are 50% more likely to grow.");
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Flower"],"*5",index,symbolsToShow);
        //TODO affect seeds
        return gives;
    }
}
class Target extends Symbols{
    constructor(){
        super("Target","images/target.png",2,1,"Gives 10 Coins when destroyed.");
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
        super("Tedium Capsule","images/tedium_capsule.png",0,1,"Destroys itself. Gives 5 Coins when destroyed. At least one of the next symbols to add will be of Common rarity.");
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
        super("Thief","images/thief.png",-1,1,"Gives ? Coins when destroyed. ? increases by 4 each spin.")
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
        super("Three Sided Die","images/three_sided_die.png",0,1,"Pays between 1 Coin and 5 Coins randomly.")
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
        super("Toddler","images/toddler.png",1,0,"Destroys adjacent Present,Candy,Piñata,and Bubble. Gives 6 Coins for each Present, Candy, Piñata, and Bubble destroyed.")
    }
    getEffects(index,symbolsToShow){
        let gives = this.giveEffectToAdjacent(["Present","Candy","Piñata","Bubble"],"destroy",index,symbolsToShow);
        let gets = this.receiveEffectFromAdjacent(["Present","Candy","Piñata","Bubble"],"+6",index,symbolsToShow);
        return [...gives,...gets];
    }
}
class Tomb extends Symbols{
    constructor(){
        super("Tomb","images/tomb.png",3,2,"Has a 6% chance of adding Spirit. Adds 4 Spirits when destroyed.");
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
        super("Treasure Chest","images/treasure_chest.png",2,2,"Gives 50 Coins when destroyed.")
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
        super("Turtle","images/turtle.png",0,0,"Gives 4 Coins every 3 spins.");
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
        super("Urn","images/urn.png",1,0,"Gives Spirit when destroyed.");
    }
    onDestroy(){
        GameState.PlayerSymbols.push(new Spirit);
    }
}
class Void_Creature extends Symbols{
    constructor(){
        super("Void Creature","images/void_creature.png",0,1,"Adjacent Empty give 1 more Coin. Destroys itself if adjacent to 0 Empty. Gives 8 Coin when destroyed.");
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
        super("Void Fruit","images/void_fruit.png",0,1,"Adjacent Empty give 1 more Coin. Destroys itself if adjacent to 0 Empty. Gives 8 Coin when destroyed.");
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
        super("Void Stone","images/void_stone.png",0,1,"Adjacent Empty give 1 more Coin. Destroys itself if adjacent to 0 Empty. Gives 8 Coin when destroyed.");
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
        super("Watermelon","images/watermelon.png",4,3,"Gives 1 Coin more for each other Watermelon.");
    }
    getEffects(index,symbolsToShow){
        return this.receiveEffectFromAllSpun(["Watermelon"],"+1",index,symbolsToShow);
    }
}
class Wealthy_Capsule extends Symbols{
    constructor(){
        super("Wealthy Capsule", "images/wealthy_capsule.png",0,1,"Destroys itself, gives 10 Coins when destroyed.");
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
        super("Wildcard","images/wildcard.png",0,3,"Gives Coin equal to the highest value among adjacent symbols.");
    }
    getEffects(index,symbolsToShow){
        this.lastPayout = 0; //Shouldn't matter, but do it anyway
        return [];
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
        super("Wine","images/wine.png",2,1,"Permanently gives +1 coins after giving coins 8 times.");
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
        super("Witch","images/witch.png",2,2,"Adjacent Cat, Owl, Crow, Apple, Hex of Destruction, Hex of Draining, Hex of Emptiness, Hex of Hoarding, Hex of Midas, Hex of Tedium, Hex of Thievery, Eldritch Creature, and Spirit give 2x more Coin.");
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