function GetClearProgress(){
  return {
    PlayerSymbols : [new Coin, new Cherry, new Pearl, new Flower, new Cat],
    PlayerItems : [],
    PlayerCoins : 5,
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

function StartGame(){
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${GameState.Spins}`
  ShowShop();
  ShowItems();
  ShowSymbols();
  spinButton.style.visibility = "visible";
  spinButton.disabled = false;
  resetButton.style.visibility = "hidden";
  resetButton.disabled = true;
}

//Rents. Can expand for more difficulties **TODO**
const RentPayChecks = [25,50,100,150,225,300,350,425,575,625,675,777,1000]
const RentSpinsChecks = [5,5,6,6,7,7,8,8,9,9,10,10,10]

const moneyShow = document.getElementById('money-display');
const rentShow = document.getElementById('rent-display');
const spinsShow = document.getElementById('spins-display');
const spinButton = document.getElementById('spin-button');
const resetButton = document.getElementById('restart-button');
const itemsDiv = document.getElementById('items-div');
const symbolsDiv = document.getElementById('symbols-div');
const shopImages = [
  document.getElementById('shopImage0'),
  document.getElementById('shopImage1'),
  document.getElementById('shopImage2')
];
const shopHeaders = [
  document.getElementById('shopHeader0'),
  document.getElementById('shopHeader1'),
  document.getElementById('shopHeader2')
];
const shopParas = [
  document.getElementById('shopPara0'),
  document.getElementById('shopPara1'),
  document.getElementById('shopPara2')
];



let GameState = GetClearProgress();
StartGame();

function spin() {
  if(GameState.hasTester){console.log("\n","---------------------------------------------------------------------------");}
  // Disable spin button during spin
  if(!GameState.canSpin){
    return 0;
  }
  GameState.canSpin = false;
  GameState.canBuy = true;
  GameState.canSkip = true;
  //Charge the player a coin to spin the wheel
  GameState.PlayerCoins -= GameState.CostToSpin; GameState.Spins--;

  //Create a place to put all effects we'll see this spin, for all items and symbols, on the board or not
  /*Expected form is an object of the following form
    {
      "from":index (Symbol index is location in PlayerSymbols, Item index location in PlayerItems *-1)
      "to":index (Symbol index is location in PlayerSymbols, Item index location in PlayerItems *-1)
      "effect":"effect" (Valid effects are:
           '+n', 
           '+n forever', 
           '*n',
           'destroy', 
           'save', 
            and are evaluated in that order)
    }
  */
  let spinEffects = [];

  // Ensure there are 15 symbols in the player's hands, adding Empties as needed
  for(let i=0; GameState.PlayerSymbols.length < 20;i++){
    if(GameState.hasTester){console.log("Adding Empty");}
    GameState.PlayerSymbols.push(new Empty);
  }

  //Items may be checked here before symbols are placed on the reel. Just in case.

  // Create an array of indices, 0 to playersymbols.length -1 
  let symbolsToShow = Array.from(Array(GameState.PlayerSymbols.length).keys())
  for (let i = symbolsToShow.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbolsToShow[i], symbolsToShow[j]] = [symbolsToShow[j], symbolsToShow[i]];
  }
  //If the player has <15 symbols, we pad it with Empties.
  //If the player has more than 15 symbols, we only show the first 15 of them on the board.
  symbolsToShow = symbolsToShow.slice(0,20);
  if(GameState.hasTester){console.log(`Symbols to show: ${symbolsToShow}`);}

// **************************************************************************** Get effects, all items and board symbols affected
  // Set the images on the reels based on the symbols
  //i is a location, 0 is top left and 14 is bottom right
  //Symbols to show is a shuffled array of indices pointing to where the symbol is in GameState.PlayerSymbols
  for (let i = 0; i < symbolsToShow.length; i++) {
    //Get effects first, so any visual change takes place before the symbol is drawn
    if(GameState.hasTester){console.log(`Getting effects for: ${GameState.PlayerSymbols[symbolsToShow[i]].name}`);}
    
    let curEffects = GameState.PlayerSymbols[symbolsToShow[i]].getEffects(i,symbolsToShow);
    for (let i=0; i<curEffects.length; i++){
      spinEffects.push(curEffects[i])
    }

    const reel = Math.floor(i / 4);
    const symbolIndex = i % 4;
    const image = document.getElementById(`symbol-${reel}-${symbolIndex}`);
    image.src = GameState.PlayerSymbols[symbolsToShow[i]].src;
    image.style.transform = `rotate(${GameState.PlayerSymbols[symbolsToShow[i]].imageRotation})`;
  }
  if(GameState.hasTester){for(let i=0; i<spinEffects.length; i++){let to = GameState.PlayerSymbols[spinEffects[i].to].name;let from = GameState.PlayerSymbols[spinEffects[i].from].name; let eff = spinEffects[i].effect; console.log(`Spin Effects: ${from} => ${to} : ${eff}`)};}
  //spinEffects.sort((a,b) => a.to - b.to);

// ************************************************ Get payouts, all items and board symbols affected and given pertinent effects
  for (let i = 0; i<symbolsToShow.length; i++){//i is the location on the board, for positional math
    let myEffects = [];
    for (let eff = 0; eff<spinEffects.length; eff++){
      if(spinEffects[eff].to == symbolsToShow[i]){
        myEffects.push(spinEffects[eff]);
      }
    }
    if(GameState.hasTester){console.log(`Getting payout for: ${GameState.PlayerSymbols[symbolsToShow[i]].name}`);}
    GameState.PlayerCoins += GameState.PlayerSymbols[symbolsToShow[i]].getPayout(myEffects);
  }

  for (let i = 0; i<symbolsToShow.length; i++){//i is the location on the board, for positional math
    if(GameState.hasTester){console.log(`Finalizing: ${GameState.PlayerSymbols[symbolsToShow[i]].name}`);}
    GameState.PlayerCoins += GameState.PlayerSymbols[symbolsToShow[i]].finalize(i, symbolsToShow);
  }

  ShowSymbols(symbolsToShow);
  ShowItems();

// ******************************************************* Check effects for destroying/saving of symbols
  //Check all symbols for destruction or saving. Also triggers end-of-spin effects
  for (let sym = GameState.PlayerSymbols.length-1; sym >= 0; sym--){
    let destroy = false; let save = false; let selfDestructing = true; let saviors = [];
    for (let i = 0; i<spinEffects.length; i++){
      if(spinEffects[i].to == sym && spinEffects[i].effect == "destroy"){
        destroy = true;
        if(spinEffects[i].to != spinEffects[i].from){
          selfDestructing = false;
        }
      }
      if(spinEffects[i].to == sym && spinEffects[i].effect == "save"){
        save = true;
        saviors.push(spinEffects[i].from);
      }
    }
    if (destroy && save && !selfDestructing){ //
      for (let i=0; i<saviors.length; i++){
        GameState.PlayerSymbols[saviors[i]].payout++;
      }
    }
    if(GameState.hasTester){console.log(`Destroying\t\t${GameState.PlayerSymbols[sym].name}, sending\t${destroy},\t${save}`);}
    GameState.PlayerSymbols[sym].Destroy(destroy, save);
  }

  
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`;
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${GameState.Spins}`
  FillShop(symbolsToShow);

  

  if(!CheckForRent()){return;}
  
  GameState.canSpin = true;
}

function ShowShop(){
  for (let i=0; i<3; i++){
    shopImages[i].src = GameState.ShopItems[i].src;
    shopHeaders[i].innerHTML = `Buy ${GameState.ShopItems[i].name}`;
    shopParas[i].innerHTML = `<p>Pays ${GameState.ShopItems[i].payout} <br /> ${GameState.ShopItems[i].description}</p>`;
  }
  if(GameState.canBuy){
    document.getElementById("shop").style.display = "block";
    if(GameState.canSkip){
      document.getElementById("skipShop").style.display = "block";
    }else{
      document.getElementById("skipShop").style.display = "none";
    }
  }
  
}

// Slight TODO, check for certain items that will aren't allowed given a player's items
function FillShop(boardState){
  let offered = [];
  for (let i=0; i<3; i++){
    let hasHighlander = false;
    for (let symbol=0; symbol < GameState.PlayerSymbols.length; symbol++){
      if (GameState.PlayerSymbols[symbol].name == "Highlander"){
        hasHighlander = true
      }
    }
    itemRarity = GetRarity(boardState)
    
    let ind = Math.floor(Math.random() * AllSymbols.length)
    let randItem = new AllSymbols[ind]
    while(randItem.rarity != itemRarity || (hasHighlander && randItem.name == "Highlander") || offered.indexOf(ind) > -1){
      ind = Math.floor(Math.random() * AllSymbols.length)
      randItem = new AllSymbols[ind]
    }
    offered.push(ind);
    GameState.ShopItems[i] = new randItem.constructor()
  }
  
  ShowShop();
}

/////////////////////////////////////////////                 TODO
function GetRarity(boardState){
  return [0,0,0,0,0,1,1,1,2,2,3][Math.floor(Math.random()*11)];
}

function BuyItem(index){
  if(!(GameState.canBuy)){
    return 0;
  }
  GameState.canBuy = false;
  GameState.canSkip = false;
  GameState.PlayerSymbols.push(new GameState.ShopItems[index].constructor());
  ShowItems();
  ShowSymbols();
  document.getElementById("shop").style.display = "none";
}

function CheckForRent(){
  if(GameState.Spins == 0){
    //Time to pay that rent!
    if(GameState.PlayerCoins > RentPayChecks[GameState.RentsPaid]){
      GameState.PlayerCoins -= RentPayChecks[GameState.RentsPaid]

      if (GameState.RentsPaid == RentPayChecks.length-1){//If this was the last known rent hit, add another then play it out
        RentSpinsChecks.push(10);
        RentPayChecks.push(RentPayChecks[GameState.RentsPaid] + 500);
      }

      GameState.RentsPaid++;
      GameState.Spins = RentSpinsChecks[GameState.RentsPaid];
      moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`;
      rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
      spinsShow.innerText = `Spins to get it: ${GameState.Spins}`
      setTimeout(function() {
        //alert(`Congratulations, you've paid your rent! Next rent is ${RentPayChecks[GameState.RentsPaid]}, due in ${RentSpinsChecks[GameState.RentsPaid]} spins.`);
      }, 300);
    }else{
      spinButton.style.visibility = "hidden";
      resetButton.style.visibility = "visible";
      resetButton.disabled = false;
      setTimeout(function() {
        //alert("You can't pay the rent. Either find more money, or get out!");
      }, 300);
      return false; //Keeps the spin button disabled until the game is reset
    }
  }
  //If we don't pay rent this spin, or if we already did
  return true;
}
function ShowItems(){
  itemsDiv.innerHTML = "<h2>Items:</h2>"
  for(let i=0; i<GameState.PlayerItems.length; i++){
    symbolsDiv.innerHTML += `<img style="width: 50px;height: 50px;" src="${GameState.PlayerItems[i].src}"></img>`
  }
}
function ShowSymbols(symbolsToShow = []){
  symbolsDiv.innerHTML = "<h2>Symbols:</h2>"
  //Get symbols that were spun
  let symbolHolds = [];
  for (let i=0; i<symbolsToShow.length; i++){
    symbolHolds.push({
      "payout":GameState.PlayerSymbols[symbolsToShow[i]].payout,
      "description":GameState.PlayerSymbols[symbolsToShow[i]].description,
      "src":GameState.PlayerSymbols[symbolsToShow[i]].src,
      "lastPayout":GameState.PlayerSymbols[symbolsToShow[i]].lastPayout
    })
  }

  //Get symbols that were not spun but that are in the deck, potentially with stacking
  let shownNames = [];
  let stackedSymbols = [];
  for (let i=0; i<GameState.PlayerSymbols.length; i++){
    if (symbolsToShow.indexOf(i) > -1){
      //We've added SymbolsToShow above
      continue;
    }

    if(shownNames.indexOf(GameState.PlayerSymbols[i].name) > -1 && GameState.PlayerSymbols[i].canStack){
      //If the symbol is already being shown from having been spun, or if it is already listed in shownNames and can stack into that
      stackedSymbols[shownNames.indexOf(GameState.PlayerSymbols[i].name)].stack++;
      continue;
    }else{
      stackedSymbols.push({
        "payout":GameState.PlayerSymbols[i].payout,
        "description":GameState.PlayerSymbols[i].description,
        "src":GameState.PlayerSymbols[i].src,
        "stack":1
      })
      shownNames.push(GameState.PlayerSymbols[i].name);
    }
  }


  symbolHolds.sort((a,b) => b.lastPayout - a.lastPayout);
  for(let i=0; i<symbolHolds.length; i++){
    symbolsDiv.innerHTML += `
      <div class="tooltip">
        <span>${symbolHolds[i].payout} ${image("coin")} <br />${symbolHolds[i].description}</span>
        <img style="width: 50px;height: 50px;" src="${symbolHolds[i].src}"></img>
        <p style="display:inline">${symbolHolds[i].lastPayout}</p>
      </div>`
  }
  symbolsDiv.innerHTML += "<br />";
  for (let i=0; i<stackedSymbols.length; i++){
    symbolsDiv.innerHTML += `
      <div class="tooltip">
        <span>${stackedSymbols[i].payout} ${image("coin")} <br />${stackedSymbols[i].description}</span>
        <img style="width: 50px;height: 50px;" src="${stackedSymbols[i].src}"></img>
        <p style="display:inline">${stackedSymbols[i].stack}</p>
      </div>`
  }
  var tooltips = document.querySelectorAll('.tooltip span');
  window.onmousemove = function (e) {
      var x = (e.clientX + 25) + 'px',
          y = (e.clientY - 25) + 'px';
      for (var i = 0; i < tooltips.length; i++) {
          tooltips[i].style.top = y;
          tooltips[i].style.left = x;
      }
  };
}

function CreateEffect(to, from, effect){
  return {
    "to": to,
    "from": from,
    "effect": effect
  }
}

function GetAdjacentIndices(index){
  //It's like a switch but I don't care that much :P
  /*
  0 4  8 12 16
  1 5  9 13 17
  2 6 10 14 18
  3 7 11 15 19
  */
  return [
    [1,4,5],//Top Left Corner
    [0,2,4,5,6],
    [1,3,5,6,7],
    [2,6,7],//Bottom left corner

    [0,1,5,8,9],
    [0,1,2,4,6,8,9,10],
    [1,2,3,5,7,9,10,11],
    [2,3,6,10,11],

    [4,5,9,12,13],
    [4,5,6,8,10,12,13,14],
    [5,6,7,9,11,13,14,15],
    [6,7,10,14,15],

    [8,9,13,16,17],
    [8,9,10,12,14,16,17,18],
    [9,10,11,13,15,17,18,19],
    [10,11,14,18,19],

    [12,13,17],
    [12,13,14,16,18],
    [13,14,15,17,19],
    [14,15,18]
  ][index]
}
function getNextPoint(index, direction){
  //Returns the index pointed to from the give index and direction, or false if it points off the spinners.
  return [
    [false,0,1,2,   false,4,5,6,   false,8,9,10,   false,12,13,14,   false,16,17,18],//Up
    [false,4,5,6,   false,8,9,10,   false,12,13,14,   false,16,17,18,   false,false,false,false],//Up right
    [4,5,6,7,   8,9,10,11,   12,13,14,15,   16,17,18,19,   false,false,false,false],//Right
    [5,6,7,false,   9,10,11,false,   13,14,15,false,   17,18,19,false,   false,false,false,false],//Down right
    [1,2,3,false,   5,6,7,false,   9,10,11,false,   13,14,15,false,   17,18,19,false],//Down
    [false,false,false,false,   1,2,3,false,   5,6,7,false,   9,10,11,false,   13,14,15,false],//Down left
    [false,false,false,false,   0,1,2,3,   4,5,6,7,   8,9,10,11,   12,13,14,15],//Left
    [false,false,false,false,   false,0,1,2,   false,4,5,6,   false,8,9,10,   false,12,13,14],//Up left
  ][direction][index];
}
function getThreshold(name){
  let thresholds = {
    "Crow":4,
    "Golem":5,
    "Frozen Fossil": 20,
    "Magpie":4,
    "Matryoshka Doll":3,
    "Matryoshka Doll 2":5,
    "Matryoshka Doll 3":7,
    "Matryoshka Doll 4":9,
    "Owl":3,
    "Present":10,
    "Robin Hood":4,
    "Sloth":2,
    "Snail":4,
    "Turtle":3
  };
  return thresholds[name];
}

function test(){
  GameState.PlayerSymbols.push(new Tester);
  GameState.hasTester = true;
}

