let hold = [];
fetch("Symbols2.json").then(response => {return response.json()}).then(data => {hold = data;})

class newSymbol{
    constructor(name, payout, rarity, description, effects, tags){
        this.name = name;
        this.src = `images/${String.prototype.toLowerCase(name).replaceAll(" ","_")}`
        this.payout = payout;
        this.rarity = rarity;
        this.description = description;
        this.effects = effects;
        this.tags = tags;

        this.state = 0; //States always start at 0 and count up as required from effects internally.
        this.status = []; //Temporary statuses applied to a Symbol when spun.
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    Reset(){ //Called at the end of every spin, when finished calculating the value gained from a spin. Won't affect internal state.
        this.status = []; //Temporary statuses applied to a Symbol when spun.
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    GetPayout(){
        return (this.payout + this.tempPayout) * this.tempMulti
    }
}

function MakeSymbol(SymbolName){

}

