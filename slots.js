function GetClearProgress(){
  return {
    PlayerSymbols : [new Present, new Present],
    PlayerItems : [],
    PlayerCoins : 5,
    Spins : 0,
    RentsPaid : 0,
    CostToSpin : 1,
    RarityMulti: 1,
    ForcedRarities: [],
    ShopItems : [new Empty, new Empty, new Empty],
    Destroyed : {}
  }
}

function StartGame(){
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${RentSpinsChecks[GameState.RentsPaid]-GameState.Spins}`
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
const shopButtons = [
  document.getElementById('shopButton0'),
  document.getElementById('shopButton1'),
  document.getElementById('shopButton2')
];



let GameState = GetClearProgress();
StartGame();

function spin() {
  // Disable spin button during spin
  spinButton.disabled = true;
  //Charge the player a coin to spin the wheel
  GameState.PlayerCoins -= GameState.CostToSpin; GameState.Spins++;

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
  for(let i=0; GameState.PlayerSymbols.length < 15;i++){
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
  symbolsToShow = symbolsToShow.slice(0,15);

// **************************************************************************** Get effects, all items and board symbols affected
  // Set the images on the reels based on the symbols
  //i is a location, 0 is top left and 14 is bottom right
  //Symbols to show is a shuffled array of indices pointing to where the symbol is in GameState.PlayerSymbols
  for (let i = 0; i < symbolsToShow.length; i++) {
    const reel = Math.floor(i / 3);
    const symbolIndex = i % 3;
    const image = document.getElementById(`symbol-${reel}-${symbolIndex}`);
    image.src = GameState.PlayerSymbols[symbolsToShow[i]].src;
    let curEffects = GameState.PlayerSymbols[symbolsToShow[i]].getEffects(i,symbolsToShow);
    for (let i=0; i<curEffects.length; i++){
      spinEffects.push(curEffects[i])
    }
  }

  console.log(spinEffects);
  //spinEffects.sort((a,b) => a.to - b.to);

// ************************************************ Get payouts, all items and board symbols affected and given pertinent effects
  for (let i = 0; i<symbolsToShow.length; i++){//i is the location on the board, for positional math
    let myEffects = [];
    for (let eff = 0; eff<spinEffects.length; eff++){
      if(spinEffects[eff].to == symbolsToShow[i]){
        myEffects.push(spinEffects[eff]);
      }
    }
    GameState.PlayerCoins += GameState.PlayerSymbols[symbolsToShow[i]].getPayout(myEffects);
  }

  for (let i = 0; i<symbolsToShow.length; i++){//i is the location on the board, for positional math
    GameState.PlayerCoins += GameState.PlayerSymbols[symbolsToShow[i]].finalize(i, symbolsToShow);
  }

// ******************************************************* Check effects for destroying/saving of symbols
  //Check all symbols for destruction or saving. Also triggers end-of-spin effects
  for (let sym = GameState.PlayerSymbols.length-1; sym >= 0; sym--){
    let destroy = false; let save = false;
    for (let i = 0; i<spinEffects.length; i++){
      if(spinEffects[i].to == sym && spinEffects[i].effect == "destroy"){
        destroy = true;
      }
      if(spinEffects[i].to == sym && spinEffects[i].effect == "save"){
        save = true;
      }
    }
    GameState.PlayerSymbols[sym].Destroy(destroy, save);
  }
  
  if(GameState.HasTester){
    GameState.PlayerSymbols.push(new AllSymbols[Math.floor(Math.random() * AllSymbols.length)]);
    console.log(GameState.PlayerSymbols[GameState.PlayerSymbols.length -1]);
  }
  ShowSymbols();
  ShowItems();
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`;
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${RentSpinsChecks[GameState.RentsPaid]-GameState.Spins}`

  if(!CheckForRent()){return;}

  FillShop(symbolsToShow);
  spinButton.disabled = false;
}

function ShowShop(){
  for (let i=0; i<3; i++){
    shopImages[i].src = GameState.ShopItems[i].src;
    shopHeaders[i].innerText = `Buy ${GameState.ShopItems[i].name}`;
    shopParas[i].innerText = `Payout: ${GameState.ShopItems[i].payout}\n${GameState.ShopItems[i].description}`;
    shopButtons[i].innerText = `Buy ${GameState.ShopItems[i].name}`;
  }
}

// Slight TODO, check for certain items that will aren't allowed given a player's items
function FillShop(boardState){
  for (let i=0; i<3; i++){
    let hasHighlander = false;
    for (let symbol=0; symbol < GameState.PlayerSymbols.length; symbol++){
      if (GameState.PlayerSymbols[symbol].name == "Highlander"){
        hasHighlander = true
      }
    }
    shopButtons[i].disabled = false;
    itemRarity = GetRarity(boardState)
    
    let randItem = new AllSymbols[Math.floor(Math.random() * AllSymbols.length)]
    while(randItem.rarity != itemRarity || (hasHighlander && randItem.name == "Highlander")){
      randItem = new AllSymbols[Math.floor(Math.random() * AllSymbols.length)]
    }

    GameState.ShopItems[i] = new randItem.constructor()
  }

  ShowShop();
}

/////////////////////////////////////////////                 TODO
function GetRarity(boardState){
  return 0;
}

function BuyItem(index){
  for (let i=0; i<3; i++){shopButtons[i].disabled = true;}
  GameState.PlayerSymbols.push(new GameState.ShopItems[index].constructor());
  ShowItems();
  ShowSymbols();
}

function CheckForRent(){
  if(GameState.Spins == RentSpinsChecks[GameState.RentsPaid]){
    //Time to pay that rent!
    if(GameState.PlayerCoins > RentPayChecks[GameState.RentsPaid]){
      GameState.Spins = 0;
      GameState.PlayerCoins -= RentPayChecks[GameState.RentsPaid]
      GameState.RentsPaid++
      setTimeout(function() {
        //alert(`Congratulations, you've paid your rent! Next rent is ${RentPayChecks[GameState.RentsPaid]}, due in ${RentSpinsChecks[GameState.RentsPaid]} spins.`);
        moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`;
        rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
        spinsShow.innerText = `Spins to get it: ${RentSpinsChecks[GameState.RentsPaid]-GameState.Spins}`
      }, 300);
    }else{
      setTimeout(function() {
        //alert("You can't pay the rent. Either find more money, or get out!");
      }, 300);
      spinButton.style.visibility = "hidden";
      resetButton.style.visibility = "visible";
      resetButton.disabled = false;
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
function ShowSymbols(){
  symbolsDiv.innerHTML = "<h2>Symbols:</h2>"
  let symbolHolds = [];
  for (let i=0; i<GameState.PlayerSymbols.length; i++){
    symbolHolds.push({
      "payout":GameState.PlayerSymbols[i].payout,
      "description":GameState.PlayerSymbols[i].description,
      "src":GameState.PlayerSymbols[i].src,
      "lastPayout":GameState.PlayerSymbols[i].lastPayout
    })
  }
  symbolHolds.sort((a,b) => b.lastPayout - a.lastPayout);
  for(let i=0; i<GameState.PlayerSymbols.length; i++){
    symbolsDiv.innerHTML += `
      <div class="tooltip">
        <span class="tooltiptext">Pays ${symbolHolds[i].payout} <br /> ${symbolHolds[i].description}</span>
        <img style="width: 50px;height: 50px;" src="${symbolHolds[i].src}"></img>
        <p style="display:inline">${symbolHolds[i].lastPayout}</p>
      </div>`
  }
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
  return [
    [1,3,4],//Top Left Corner
    [0,2,3,4,5],
    [1,4,5],//Bottom left corner

    [0,1,4,6,7],
    [0,1,2,3,5,6,7,8],
    [1,2,4,7,8],

    [3,4,7,9,10],
    [3,4,5,6,8,9,10,11],
    [4,5,7,10,11],

    [6,7,10,12,13],
    [6,7,8,9,11,12,13,14],
    [7,8,10,13,14],

    [9,10,13],
    [9,10,11,12,14],
    [10,11,13]
  ][index]
}

function getThreshold(name){
  let thresholds = {
    "Crow":4,
    "Golem":5,
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