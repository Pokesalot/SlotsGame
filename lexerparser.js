let GameState = {};
function GetClearProgress(){
  return {
    PlayerSymbols : [new Coin, new Flower, new Cat, new Pearl, new Cherry],
    NewPlayerSymbols : [],
    SpinEffects : [], //All effects for all symbols and items, taken or not
    SpinActions : [], //Effects that actually triggered, including origin and target where applicable
    PlayerItems : [],
    PlayerCoins : 1,
    Board : GetStartingBoard(1),
    Spins : RentSpinsChecks[0],
    RentsPaid : 0,
    CostToSpin : 1,
    RarityMulti: 1,
    ForcedRarities: [],
    ShopItems : [new Empty, new Empty, new Empty],
    Destroyed : {},
    canBuy: false,
    canSpin: true,
    canSkip: false,
    hasTester: false
  }
}

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
            MakeSymbol("Void Fruit"),MakeSymbol("Coin"),MakeSymbol("Empty"),MakeSymbol("Empty"),
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

        let pool = "ABCDEFGHIJKLMNOP12345678901234567890";
        let id = "";
        for(let i=0;i<8;i++){
            if(i%5 == 4){id += "-"}
            id += pool[Math.floor(Math.random() * pool.length)],1;
        }
        this.id = id;

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

function GetSymbolEffects(){
    //Adds all possible effects for all symbols on the board to the SpinEffects array, then sorts it by precedence
    //This will be run any time we change the state of the board, since it also removes duplicates, so nothing should fire twice
    for(let i=0;i<20;i++){
        //Construct this symbol's effects
        for(let j=0;j<GameState.Board[i].effects.length;j++){
            let check = `${GameState.Board[i].effects[j]}|${GameState.Board[i].id}|${i}`
            if(GameState.SpinEffects.indexOf(check) == -1){
                GameState.SpinEffects.push(check)
            }
        }
        //Sort the list of effects by their precedence
        GameState.SpinEffects.sort((a,b) => a.split(" ")[0] - b.split(" ")[0] )
    }
}
function GetItemEffects(){
    //Standin, will be added when symbols actually exist
}

function ResolveEffects(){
    //This function will step through and evaluate all effects in order for Gamestate.SpinEffects
    //Actions that do trigger will be noted in the GameState.SpinActions 

    //Utilizes GetAdjacentIndices to check for adjacency
    //Check effects to 100, check for destroy, transform, or add. If any of those trigger, get effects again and check effects again.
    //If no symbols destroy, transform, or add, then just continue to the end of effects, just in case.
    //This allows symbols to change the game after a spin is "over"

    let restartAt100 = false;
    for(let i=0;i<GameState.SpinEffects.length;i++){
        let vocab = 0; 
            // 0 - Self qualities check
            // 1 - Effect check
            // 2 - Other symbols check
        let words = GameState.SpinEffects[i].split("|")[0].split(" ")
        for (let word = 1; word < words.length; word++ ){
            switch(vocab){
                case 0:
                    //Self qualifiers only
                    if(words[word][0] == "'"){//Self checking a quality
                        let qual = words[word].slice(1);
                        console.log(qual);
                    }
                    break;
            }
        }
    }
}

function MakeSymbol(SymbolName){
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

