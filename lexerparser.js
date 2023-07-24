let GameState = {};
function GetClearProgress(){
  return {
    AllowedTags : ["basegame"],
    PlayerSymbols : [],
    PermanentSpinEffects : [],
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
    ShopItems : [],
    Destroyed : [],
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
        this.imageRotation = 0;
        this.payout = payout;
        this.rarity = rarity;
        this.description = description;
        if (description != ""){
            this.description = "----------<br />" + this.description
        }
        while(this.description.indexOf("/") != -1){
            let halves = this.description.split("/");
            let seconds = halves[1].split(" ");
            let keys = Object.keys(AllSymbolsJson);
            let imageText = "";
            for(let get=0; get<keys.length; get++){
                if(AllSymbolsJson[keys[get]].Name == seconds[0].replace("_"," ") || AllSymbolsJson[keys[get]].Tags.indexOf(seconds[0]) != -1){
                    imageText += `<img class="inline-image" alt="${AllSymbolsJson[keys[get]].Name}" style src="images/${AllSymbolsJson[keys[get]].Name.toLowerCase().replace(" ","_")}.png"></img>`;
                }
            }
            this.description = [halves[0],imageText,seconds[1]].join("");
        }
        this.effects = effects;
        this.tags = tags;

        let pool = "ABCDEFGHIJKLMNOP12345678901234567890";
        let id = "";
        for(let i=0;i<8;i++){
            if(i == 4){id += "-"}
            id += pool[Math.floor(Math.random() * pool.length)],1;
        }
        this.id = id;
        this.totalPayout = 0;
        this.lastPayout = 0;

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
    Transform(SymbolName){//Make sure to store the old symbol's payout before transforming!
        newStats = AllSymbolsJson[SymbolName];
        this.name = newStats.name;
        this.src = `images/${newStats.name.toLowerCase().replaceAll(" ","_")}.png`
        this.payout = newStats.payout
        this.rarity = newStats.rarity
        this.description = newStats.description
        this.effects = newStats.effects
        this.tags = newStats.tags
        
        //After a transformation, the board reruns all checks
        this.state = 0;
        this.status = [];
        this.adjacencies = [];
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    GetPayout(){
        let payout = Math.floor((parseInt(this.payout) + parseInt(this.tempPayout)) * parseFloat(this.tempMulti));
        this.totalPayout += payout;
        this.lastPayout = payout;
        return payout
    }
}

function GetSymbolEffects(){
    //Adds all possible effects for all symbols on the board to the SpinEffects array, then sorts it by precedence
    //This will be run any time we change the state of the board, since it also removes duplicates, so nothing should fire twice
    for(let i=0;i<20;i++){
        //Construct this symbol's effects
        for(let j=0;j<GameState.Board[i].effects.length;j++){
            let check = GameState.Board[i].effects[j].replace("ID",GameState.Board[i].id);
            if(GameState.SpinEffects.indexOf(check) == -1 && check.split(" ")[0] != "ON"){
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
    function getCheckList(){return [...GameState.Board,...GameState.PlayerItems]}
    function trimList(list,checkString){
        words = checkString.split(" ")
        wordSub = 0;

        while(wordSub < words.length){
            //While we're looking for a verb, let's trim down the subject.
            words[wordSub] = words[wordSub].replace("_"," ");
            
            let not = false;
            if(words[wordSub][0] == "!"){
                not = true;
                words[wordSub].splice(0,1);
            }
            for(let check=list.length -1; check>-1;check--){
                let toss = true;
                //Handle a string search for id, name, or a tag
                if(list[check] == 0){list.splice(check,1);continue;}
                if(toss && list[check].id == words[wordSub]){toss = false;}
                if(toss && list[check].name == words[wordSub]){toss = false;}
                if(toss && list[check].tags.indexOf(words[wordSub]) != -1){toss = false;}
                if(toss && list[check].status.indexOf(words[wordSub]) != -1){toss = false;}
                //Handle the THRESHOLD tag
                if(toss && words[wordSub] == "RANDOM" && Math.random() < parseFloat(words[wordSub+1])){toss=false;wordSub++;}
                if(toss && words[wordSub] == "THRESHOLD" && list[check].state >= getThreshold(list[check].name)){toss=false;}
                //ADJ is not handled here, since it cannot be determined in this general sense
                if(toss && words[wordSub] == "TOTAL"){
                    let totalCount = 0; let totalCheck = [...GameState.Board,...GameState.PlayerItems]
                    for(let countsub=0;countsub<totalCheck.length;countsub++){
                        if(totalCheck[countsub].name == words[wordSub+1] 
                            || totalCheck[countsub].tags.indexOf(words[wordSub+1]) != -1
                            || totalCheck[countsub].status.indexOf(words[wordSub+1]) != -1 ){
                                totalCount++;
                            }
                    }
                    if(totalCount >= parseInt(words[wordSub+2])){
                        toss=false;
                    }
                    wordSub += 2;
                }


                if((toss && !not) || (!toss && not)){
                    list.splice(check,1);
                }
            }
            wordSub++;
        }
        return list;

    }
    function getAdjacency(sym1, sym2){
        let inds = []; let adj1 = []; let adj2 = [];
        for(i=0;i<sym1.status.length;i++){
            if(sym1.status[i].indexOf("Ind") == 0){
                inds.push(parseInt(sym1.status[i].split("Ind")[1]))
            }
            if(sym1.status[i].indexOf("Adj") == 0){
                adj1.push(parseInt(sym1.status[i].split("Adj")[1]));
            }
        }
        for(i=0;i<sym2.status.length;i++){
            if(sym2.status[i].indexOf("Ind") == 0){
                inds.push(parseInt(sym2.status[i].split("Ind")[1]))
            }
            if(sym2.status[i].indexOf("Adj") == 0){
                adj2.push(parseInt(sym2.status[i].split("Adj")[1]));
            }
        }
        if(GetAdjacentIndices(inds[0]).indexOf(inds[1]) != -1){
            return true;
        }
        if(adj1.indexOf(inds[1]) != -1 || adj2.indexOf(inds[0]) != -1){
            return true;
        }
        return false;
        
    }
    //This function will step through and evaluate all effects in order for Gamestate.SpinEffects
    //Actions that do trigger will be noted in the GameState.SpinActions 

    //Utilizes GetAdjacentIndices to check for adjacency
    //Check effects to 100, check for destroy, remove, transform, or add. If any of those trigger, get effects again and check effects again.
    //If no symbols destroy, transform, or add, then just continue to the end of effects, just in case.
    //This allows symbols to change the game after a spin is "over"

    let restartAt100 = false;
    console.log(GameState.SpinEffects)
    for(let i=0;i<GameState.SpinEffects.length;i++){

        /*
            "10 Void_Fruit GETS NoEmpties",
			"15 Void_Fruit GIVES PAY 1 TO ADJ Empty",
			"20 Void_Fruit GETS !NoEmpties FROM ADJ Empty",
			"30 NoEmpties GETS DESTROY",
			"50 DESTROY GETS PAY 8",
			"ON DESTROY ADD Coin"
        */ // let i = 1;
        
        let curEffect = GameState.SpinEffects[i];
        let senders = getCheckList(); let receivers = getCheckList();
        let checkADJ = false;
        let effectWords = [];
        if(curEffect.indexOf("GIVES") != -1){ //Must have a "TO" clause
            words = curEffect.split(" ").slice(1);
            let filter = words.splice(0,words.indexOf("GIVES")).join(" ")

            senders = trimList(senders,filter)
            words = curEffect.split(" ");
            filter = words.slice(words.indexOf("TO")+1);
            if(filter.indexOf("ADJ") != -1){
                checkADJ = true;
                filter.splice(filter.indexOf("ADJ"),1);
            }
            filter = filter.join(" ");
            receivers = trimList(receivers,filter);

            words = curEffect.split(" ");
            words.splice(0,words.indexOf("GIVES")+1);
            words.splice(words.indexOf("TO"))
            effectWords = words;
        }else if(curEffect.indexOf("GETS") != -1){
            words = curEffect.split(" ").slice(1);
            let filter = words.splice(0,words.indexOf("GETS")).join(" ")
            receivers = trimList(receivers,filter)
            words = curEffect.split(" ");
            filter = words.slice(words.indexOf("FROM")+1);
            if(filter.indexOf("ADJ") != -1){
                checkADJ = true;
                filter = filter.splice(filter.indexOf("ADJ"),1);
            }
            filter = filter.join(" ");
            senders = trimList(senders,filter);

            words = curEffect.split(" ");
            words.splice(0,words.indexOf("GETS")+1);
            if(words.indexOf("FROM")){
                words.splice(words.indexOf("FROM"));
            }
            effectWords = words;
        }
        //Senders and receivers are set at this point
        for(send=0; send<senders.length; send++){
            for(rec=0; rec<receivers.length; rec++){
                if(!checkADJ || (checkADJ && getAdjacency(senders[send],receivers[rec]))){
                    //sender[send] and receiver[rec] are verified to interact in here.
                    //lex how and what effects are being given
                    //effectWords is an array of words that make up the effect
                    let paperTrail = "";
                    for(word=0; word<effectWords.length; word++){
                        switch(effectWords[word]){
                            case "PAY":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ${i} PAY ${effectWords[word+1]}`
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].tempPayout += parseInt(effectWords[word+1])
                                }
                                word++
                                break;
                            case "PAYOUT":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ${i} PAYOUT ${effectWords[word+1]}`
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].payout += parseInt(effectWords[word+1])
                                }
                                word++
                                break;
                            case "MULTI":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ${i} MULTI ${effectWords[word+1]}`
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].tempMulti *= parseFloat(effectWords[word+1])
                                }
                                word++
                                break;
                            case "STATE":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ${i} STATE ${effectWords[word+1]}`
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].state += parseInt(effectWords[word+1])
                                }
                                word++
                                break;
                            default:
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ${i} STATUS ${effectWords[word]}`
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    if(effectWords[word][0] == "!"){
                                        //Check if the symbol has the tag without the bang. If so, remove it and add it with the bang
                                        let removeCheck = effectWords[word].slice(1);
                                        if(receivers[rec].status.indexOf(removeCheck) != -1){
                                            receivers[rec].status.splice(receivers[rec].status.indexOf(removeCheck),1);
                                        }
                                        receivers[rec].status.push(effectWords[word]);
                                    }else{
                                        //Just a status, add unless it exists with ! in front of it
                                        if(receivers[rec].status.indexOf(`!${effectWords[word]}`) == -1){
                                            receivers[rec].status.push(effectWords[word]);
                                        }
                                    }
                                }
                        }
                    }
                    
                }
            }
        }
        
    }
}

function AddSymbol(SymbolName){
    //Checks for an Empty and removes it from the pool if one is found, random board empties taking precedent.
    //Can also add code to check for items that have effects trigger on symbols being added
    let empties = [];
    for(let i=0; i<GameState.Board.length; i++){
        if(GameState.Board[i].name == "Empty"){
            empties.push(i)
        }
    }
    if(empties.length > 0){
        GameState.Board[empties[Math.floor(Math.random() * empties.length)]] = MakeSymbol(SymbolName)
    }else{
        GameState.PlayerSymbols.push(MakeSymbol(SymbolName))
    }
    DrawBoard();
}
function DestroySymbol(Symbol){
    AddSymbol("Empty");
    //Check for items that trigger on symbols being removed, and run any effects of a symbol that has "ON DESTROY"
}
function RemoveSymbol(Symbol){
    AddSymbol("Empty");
    //Check for items that trigger on symbols being removed, and run any effects of a symbol that has "ON REMOVE"
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

