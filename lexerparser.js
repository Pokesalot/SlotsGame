async function fetchData() {
    let response = await fetch("./Symbols2.json");
    let data = await response.json();
    AllSymbolsJson = data;

    GameState = GetClearProgress();
    StartGame();
}
//Run this on page load. Resetting the game once all symbols and items have been loaded will be faster, and handled in another place.
fetchData();

function GetStartingBoard(Difficulty){
    if(Difficulty <= 5){
      //No duds
      return [
        MakeSymbol("Empty"),MakeSymbol("Coin"),MakeSymbol("Empty"),MakeSymbol("Empty"),
        MakeSymbol("Empty"),MakeSymbol("Empty"),MakeSymbol("Cherry"),MakeSymbol("Empty"),
        MakeSymbol("Empty"),MakeSymbol("Pearl"),MakeSymbol("Empty"),MakeSymbol("Empty"),
        MakeSymbol("Empty"),MakeSymbol("Empty"),MakeSymbol("Flower"),MakeSymbol("Empty"),
        MakeSymbol("Empty"),MakeSymbol("Cat"),MakeSymbol("Empty"),MakeSymbol("Empty"),
      ]
    }
  }

class newSymbol{
    constructor(name, payout, rarity, description, effects, tags){
        this.name = name;
        this.src = `images/${name.toLowerCase().replaceAll(" ","_")}.png`
        this.payout = payout;
        this.rarity = rarity;
        this.description = description;
        this.effects = effects;
        this.tags = tags;

        this.state = 0; //States always start at 0 and count up as required from effects internally.
        this.status = []; //Temporary statuses applied to a Symbol when spun.
        this.adjacencies = []; //This should be kept as a list of BOARD LOCATIONS that the Symbol is considered to be adjacent to.
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    Reset(){ //Called at the end of every spin, when finished calculating the value gained from a spin. Won't affect internal state.
        this.status = [];
        this.adjacencies = [];
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    GetPayout(){
        return (this.payout + this.tempPayout) * this.tempMulti
    }
}

function MakeSymbol(SymbolName){
    console.log(SymbolName)
    let ns = AllSymbolsJson[SymbolName]
    return new newSymbol(ns["Name"],ns["Payout"],ns["Rarity"],ns["Description"],ns["Effects"],ns["Tags"])
}

function SearchSymbols(Search){
    let searchLevel = 0;
    switch(Search[0]){//Substring
        case "'":
            //By name
            return AllSymbolsJson[Search.substring(1)]
        case "q":
            //Searches permanent and temporary statuses
            searchLevel++;
        case "#":
            //May search only permanents, or may search both if searchlevel is 1 already.
            let finds = [];
            let keys = Object.keys(AllSymbolsJson)
            for(let i = 0; i<(keys.length-1);i++){
                if(searchLevel == 1){
                    if(AllSymbolsJson[keys[i]].status.indexOf(Search.substring(1)) ||  AllSymbolsJson[keys[i]].tags.indexOf(Search.substring(1))){
                        finds.push(AllSymbolsJson[keys[i]])
                    }
                }
                else{//Search level is 0, only permanents
                    if(AllSymbolsJson[keys[i]].status.indexOf(Search.substring(1))){
                        finds.push(AllSymbolsJson[keys[i]])
                    }
                }
            }
            return finds;
    }
}

