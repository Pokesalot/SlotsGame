let GameState = {};
function GetClearProgress(){
  return {
    AllowedTags : ["basegame"],
    PlayerSymbols : [],
    PermanentSpinEffects : ["100 REMOVE", "100 DESTROY", "100 STATE0", "102 CHECKRESTART"],
    TempSymbols : [],
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
    DrawBoard();
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
        this.imageRotation = 0;
        this.payout = parseInt(payout);
        this.rarity = rarity;
        let reps = 4;
        let desc = description;
        while(desc.indexOf(" /") != -1 && reps > 0){
            let slash = desc.indexOf(" /");
            let nextSpace = desc.indexOf(" ",slash+1);
            let searchText = desc.substr(slash+2,nextSpace-slash-2);
            let keys = Object.keys(AllSymbolsJson);
            let imageText = desc.substr(0,slash+1);
            let fin = desc.substring(nextSpace);
            for(let get=0; get<keys.length; get++){
                if(AllSymbolsJson[keys[get]].Name == searchText.replace("_"," ") || AllSymbolsJson[keys[get]].Tags.indexOf(searchText) != -1){
                    imageText += `<img class="inline-image" alt="${AllSymbolsJson[keys[get]].Name}" style src="images/${AllSymbolsJson[keys[get]].Name.toLowerCase().replace(" ","_")}.png"></img>`;
                }
            }
            desc = imageText + fin;
            reps--;
        }
        if (desc != ""){
            desc = "----------<br />" + desc;
        }
        this.description = desc;

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
        this.GetPayout();
        let newStats = AllSymbolsJson[SymbolName];
        this.name = newStats.Name;
        this.src = `images/${newStats.Name.toLowerCase().replaceAll(" ","_")}.png`
        this.payout = newStats.Payout
        this.rarity = newStats.Rarity
        this.description = newStats.Description
        this.effects = newStats.Effects
        this.tags = newStats.Tags
        
        //After a transformation, the board reruns all checks
        this.state = 0;
        this.status.push("TRANSFORMED");
        this.adjacencies = [];
        this.tempPayout = 0;
        this.tempMulti = 1;
    }
    GetPayout(){
        let payout = Math.floor((parseInt(this.payout) + parseInt(this.tempPayout)) * parseFloat(this.tempMulti));
        GameState.SpinActions.push(`${this.name}(${this.id})=>Payout ${payout}`)
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
            let check = GameState.Board[i].effects[j].replaceAll("ID",GameState.Board[i].id);
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
    function getCheckList(){return [...GameState.Board,...GameState.PlayerItems,...GameState.TempSymbols]}
    function trimList(list,checkString){
        words = checkString.split(" ")
        wordSub = 0;
        while(wordSub < words.length){
            //While we're looking for a verb, let's trim down the subject.
            words[wordSub] = words[wordSub].replace("_"," ");
            
            let not = false;
            if(words[wordSub][0] == "!"){
                not = true;
                words[wordSub] = words[wordSub].slice(1);
            }
            let advance = 1;
            for(let check=list.length -1; check>-1;check--){
                //ADJ is not handled here, since it cannot be determined in this general sense
                let toss = true;
                //Handle a string search for id, name, or a tag
                if(list[check] == 0){list.splice(check,1);continue;}
                if(toss && list[check].id == words[wordSub]){toss = false;}
                if(toss && list[check].name == words[wordSub]){toss = false;}
                if(toss && list[check].tags.indexOf(words[wordSub]) != -1){toss = false;}
                if(toss && list[check].status.indexOf(words[wordSub]) != -1){toss = false;}
                
                if(toss && words[wordSub] == "RANDOM"){
                    let roll = Math.random();
                    if(roll < parseFloat(words[wordSub+1])){toss=false;}
                    advance = 2;
                }
                if(toss && words[wordSub] == "THRESHOLD" && list[check].state >= getThreshold(list[check])){toss=false;}
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
                    advance = 3
                }

                if((toss && !not) || (!toss && not)){
                    list.splice(check,1);
                }
            }
            wordSub += advance;
        }
        return list;

    }
    function getAdjacency(sym1, sym2){
        let inds = [GameState.Board.indexOf(sym1),GameState.Board.indexOf(sym2)]; let adj1 = []; let adj2 = [];
        if(inds.indexOf(-1) != -1){return false};//one or both symbols is not on the board, therefore adjacent to nothing
        for(i=0;i<sym1.status.length;i++){
            if(sym1.status[i].indexOf("Adj") == 0){
                adj1.push(parseInt(sym1.status[i].split("Adj")[1]));
            }
        }
        for(i=0;i<sym2.status.length;i++){
            if(sym2.status[i].indexOf("Adj") == 0){
                adj2.push(parseInt(sym2.status[i].split("Adj")[1]));
            }
        }
        if(GetAdjacentIndices(inds[0]).indexOf(inds[1]) != -1
            || adj1.indexOf(inds[1]) != -1 || adj2.indexOf(inds[0]) != -1){
            return true;
        }else{
            return false;
        }
    }
    //This function will step through and evaluate all effects in order for Gamestate.SpinEffects
    //Actions that do trigger will be noted in the GameState.SpinActions 

    //Utilizes GetAdjacentIndices to check for adjacency
    //Check effects to 100, check for destroy, remove, transform, or add. If any of those trigger, get effects again and check effects again.
    //If no symbols destroy, transform, or add, then just continue to the end of effects, just in case.
    //This allows symbols to change the game after a spin is "over"

    let restartAt100 = false;
    for(let i=0;i<GameState.SpinEffects.length;i++){
        let curEffect = GameState.SpinEffects[i];
        if(curEffect == "100 REMOVE"){
            for(let checkSym=0; checkSym<GameState.Board.length; checkSym++){
                if(GameState.Board[checkSym].status.indexOf("REMOVE") != -1){
                    GameState.Board[checkSym].GetPayout();
                    GameState.Destroyed.push(GameState.Board[checkSym].name);
                    GameState.TempSymbols.push(GameState.Board[checkSym]);
                    GameState.Board[checkSym].Transform("Empty");
                    restartAt100 = true;
                }
            }
            continue;
        }
        if(curEffect == "100 DESTROY"){
            for(let checkSym=0; checkSym<GameState.Board.length; checkSym++){
                if(GameState.Board[checkSym].status.indexOf("DESTROY") != -1){
                    GameState.Board[checkSym].GetPayout();
                    GameState.Destroyed.push(GameState.Board[checkSym].name);
                    GameState.TempSymbols.push(GameState.Board[checkSym]);
                    GameState.Board[checkSym] = MakeSymbol("Empty");
                    restartAt100 = true;
                }
            }
            continue;
        }
        if(curEffect == "100 STATE0"){
            for(let checkSym=0; checkSym<GameState.Board.length; checkSym++){
                if(GameState.Board[checkSym].status.indexOf("STATE0") != -1){
                    GameState.Board[checkSym].state=0;
                }
            }
            continue;
        }
        if(curEffect == "102 CHECKRESTART" && restartAt100){
            if(testing){console.log(`From the top. Effects are: ${GameState.SpinActions}`);if(GameState.SpinActions.length > 200){break;}}
            restartAt100 = false;
            GetSymbolEffects();
            GetItemEffects();
            i = -1;
            continue;
        }else if(curEffect == "102 CHECKRESTART"){
            // Get payouts at precedence 101. More effects may trigger, but they will not pay out. 
            for (let i = 0; i<GameState.Board.length; i++){//i is the location on the board, for positional math
                if(GameState.Board[i].tags.indexOf("WILDCARD") == -1 && GameState.Board[i].status.indexOf("WILDCARD") == -1){
                    GameState.PlayerCoins += GameState.Board[i].GetPayout();
                }
            }
            for (let i = 0; i<GameState.Board.length; i++){//i is the location on the board, for positional math
                if(GameState.Board[i].tags.indexOf("WILDCARD") != -1 || GameState.Board[i].status.indexOf("WILDCARD") != -1){
                    console.log(`Found a wildcard symbol at position ${i}`)
                    let adjs = GetAdjacentIndices(i); let maxPayout = 0;
                    for(let adjsym = 0; adjsym<adjs.length; adjsym++){
                        if(GameState.Board[adjs[adjsym]].tags.indexOf("WILDCARD") == -1 && GameState.Board[adjs[adjsym]].status.indexOf("WILDCARD") == -1){
                            maxPayout = Math.max(maxPayout, GameState.Board[adjs[adjsym]].lastPayout)
                        }
                    }
                    let curPayout = (parseInt(GameState.Board[i].tempPayout) + maxPayout) * GameState.Board[i].tempMulti;
                    GameState.SpinActions.push(`${GameState.Board[i].name}(${GameState.Board[i].id})=>Payout ${curPayout}`)
                    GameState.Board[i].totalPayout += curPayout;
                    GameState.Board[i].lastPayout = curPayout;
                }
            }
            for (let i = 0; i<GameState.PlayerItems; i++){
                GameState.PlayerCoins += GameState.PlayerItems[i].GetPayout();
            }
        }

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
                filter.splice(filter.indexOf("ADJ"),1);
            }
            filter = filter.join(" ");
            senders = trimList(senders,filter);

            words = curEffect.split(" ");
            words.splice(0,words.indexOf("GETS")+1);
            words.splice(words.indexOf("FROM"));
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
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect PAY ${effectWords[word+1]}`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].tempPayout += parseInt(effectWords[word+1]);
                                }
                                word++
                                break;
                            case "PAYOUT":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect PAYOUT ${effectWords[word+1]}`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].payout += parseInt(effectWords[word+1]);
                                }
                                word++;
                                break;
                            case "MULTI":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect MULTI ${effectWords[word+1]}`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].tempMulti *= parseFloat(effectWords[word+1]);
                                }
                                word++
                                break;
                            case "STATE":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect STATE ${effectWords[word+1]}`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].state += parseInt(effectWords[word+1]);
                                }
                                word++;
                                break;
                            case "ADD":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect ADD ${effectWords[word+1]}`;
                                GameState.SpinActions.push(paperTrail);

                                let keys = Object.keys(AllSymbolsJson);
                                if(keys.indexOf(effectWords[word+1]) != -1){
                                    AddSymbol(effectWords[word+1]);
                                }else{
                                    let likes = [[],[],[],[]];
                                    for(let check=0;check<keys.length;check++){
                                        if(AllSymbolsJson[keys[check]].Tags.indexOf(effectWords[word+1]) != -1){
                                            likes[["Common","Uncommon","Rare","Very Rare"].indexOf(AllSymbolsJson[keys[check]].Rarity)].push(AllSymbolsJson[keys[check]].Name)
                                        }
                                    }
                                    let rare = GetRarity()
                                    AddSymbol(likes[rare][Math.floor(Math.random() * likes[rare].length)])
                                }
                                restartAt100 = true;
                                word++;
                                break;
                            case "TRANSFORM":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect TRANSFORM ${effectWords[word+1]}`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1){
                                    GameState.SpinActions.push(paperTrail);

                                    if(keys.indexOf(effectWords[word+1]) != -1){
                                        receivers[rec].Transform(effectWords[word+1]);
                                    }else{
                                        let likes = [[],[],[],[]];
                                        for(let check=0;check<keys.length;check++){
                                            if(AllSymbolsJson[keys[check]].Tags.indexOf(effectWords[word+1]) != -1){
                                                likes[["Common","Uncommon","Rare","Very Rare"].indexOf(AllSymbolsJson[keys[check]].Rarity)].push(AllSymbolsJson[keys[check]].Name)
                                            }
                                        }
                                        let rare = GetRarity()
                                        receivers[rec].Transform(likes[rare][Math.floor(Math.random() * likes[rare].length)]);
                                    }
                                    restartAt100 = true;
                                }
                                word++;
                                break;
                            case "SCALE":
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect SCALE`;
                                if(GameState.SpinActions.indexOf(paperTrail) == -1 && (receivers[rec].tempMulti > 1 || receivers[rec].tempPayout>0)){
                                    GameState.SpinActions.push(paperTrail);
                                    receivers[rec].payout++;
                                }
                                break;
                            default:
                                paperTrail = `${senders[send].name}(${senders[send].id})=>${receivers[rec].name}(${receivers[rec].id}): Effect STATUS ${effectWords[word]}`
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
        
    }//End of effects being checked, getting here means the board is in a final resting state
    DrawBoard();
}

function AddSymbol(SymbolName){
    //Checks for an Empty and removes it from the pool if one is found, random board empties taking precedent.
    //Can also add code to check for items that have effects trigger on symbols being added
    let empties = []; let newSym = MakeSymbol(SymbolName.replaceAll("_"," "));
    for(let i=0; i<GameState.Board.length; i++){
        if(GameState.Board[i].name == "Empty"){
            empties.push(i)
        }
    }
    if(empties.length > 0){
        //TODO add tags for location checks, it may come in handy
        let newLoc = empties[Math.floor(Math.random() * empties.length)];
        GameState.Board[newLoc] = newSym
        GameState.Board[newLoc].status.push(`Col${Math.floor(newLoc / 4)}`);
        GameState.Board[newLoc].status.push(`Row${newLoc%4}`);
        GameState.Board[newLoc].status.push(`Ind${newLoc}`);
    }else{
        GameState.PlayerSymbols.push(newSym)
    }
    DrawBoard();
}

function MakeSymbol(SymbolName){
    let ns = AllSymbolsJson[SymbolName]
    return new newSymbol(ns["Name"],ns["Payout"],ns["Rarity"],ns["Description"],ns["Effects"],ns["Tags"])
}
