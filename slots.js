function StartGame(){
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${GameState.Spins}`
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

  //Load all symbols from the board into the symbol collection
  while(GameState.Board.length > 0){ 
      GameState.PlayerSymbols.push(GameState.Board.pop());
  }

  //Fill the board randomly with symbols just added to the pool. This should mitigate not having enough symbols to shuffle in.
  for(let i=0;i<20;i++){
    let ind = Math.floor(Math.random() * GameState.PlayerSymbols.length);
    GameState.Board.push(GameState.PlayerSymbols[ind]);
    GameState.PlayerSymbols.splice(ind,1);
    
    //Reset symbols being put onto the board, then tag them to be location aware without a lot of extra help.
    //Location aware symbols will have a lot of effects to count for all locations, tough shit.
    GameState.Board[i].Reset();
  }

  // \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/
  //Effects from items that change symbol positions on the board go here
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  for(let i=0;i<20;i++){
    GameState.Board[i].status.push(`Col${Math.floor(i/4)}`);
    GameState.Board[i].status.push(`Row${i%4}`);
    GameState.Board[i].status.push(`Ind${i}`)
  }


  //Get effects from symbols on the board and items in hand, then resolve them.
  GameState.SpinEffects = GameState.PermanentSpinEffects;
  GameState.SpinActions = [];
  GetSymbolEffects();
  GetItemEffects();
  ResolveEffects();
  //This is the bulk of a spin, after that it's mainly rendering symbols and receiving coins
  DrawBoard();
  

  // Get payouts
  for (let i = 0; i<GameState.Board.length; i++){//i is the location on the board, for positional math
    GameState.PlayerCoins += GameState.Board[i].GetPayout();
  }
  for (let i = 0; i<GameState.PlayerItems; i++){
    GameState.PlayerCoins += GameState.PlayerItems[i].GetPayout();
  }

  //ShowSymbols();
  //ShowItems();

  
  moneyShow.innerText = `Coins: ${GameState.PlayerCoins}`;
  rentShow.innerText = `Rent Due: ${RentPayChecks[GameState.RentsPaid]}`
  spinsShow.innerText = `Spins to get it: ${GameState.Spins}`
  setTimeout(() => {
    FillShop();
  }, 600); 

  

  if(!CheckForRent()){return;}
  
  GameState.canSpin = true;
}

function DrawBoard(){
  // Set the images on the reels based on the symbols in Gamestate.Board
  for (let i = 0; i < GameState.Board.length; i++) {
    const reel = Math.floor(i / 4);
    const symbolIndex = i % 4;
    const image = document.getElementById(`symbol-${reel}-${symbolIndex}`);
    image.src = GameState.Board[i].src;
    image.style.transform = `rotate(${GameState.Board[i].imageRotation})`;
  }
}

function ShowShop(){
  for (let i=0; i<3; i++){
    let temp = MakeSymbol(GameState.ShopItems[i].name)
    shopImages[i].src = temp.src;
    shopHeaders[i].innerHTML = `Buy ${temp.name}`;
    shopParas[i].innerHTML = `<p>Pays ${temp.payout} <br /> ${temp.description}</p>`;
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
  let hasHighlander = false;
  GameState.ShopItems = [];
  for (let symbol=0; symbol < GameState.PlayerSymbols.length; symbol++){
    if (GameState.PlayerSymbols[symbol].name == "Highlander"){
      hasHighlander = true
    }
  }
  for (let symbol=0; symbol < GameState.Board.length; symbol++){
    if (GameState.Board[symbol].name == "Highlander"){
      hasHighlander = true
    }
  }
  for (let i=0; i<3; i++){
    itemRarity = GetRarity()
    let keys = Object.keys(AllSymbolsJson)
    let offerable = [];
    for(let find=0;find<keys.length;find++){
      let foundAcceptableTag = false
      for(let tag=0;tag<GameState.AllowedTags.length;tag++){
        if(AllSymbolsJson[keys[find]].Tags.indexOf(GameState.AllowedTags[tag]) != -1){
          foundAcceptableTag = true;
        }
      }
      if(foundAcceptableTag && AllSymbolsJson[keys[find]].Rarity == ["Common","Uncommon","Rare","Very Rare"][itemRarity]){
        offerable.push(keys[find]);
      }
    }
    let ind = Math.floor(Math.random() * offerable.length)
    let randItem = AllSymbolsJson[offerable[ind]]
    while((hasHighlander && randItem.name == "Highlander")){
      ind = Math.floor(Math.random() * offerable.length)
      randItem = new AllSymbolsJson[ind]
    }
    GameState.ShopItems.push(MakeSymbol(offerable[ind]));
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

  AddSymbol(GameState.ShopItems[index].name)
  document.getElementById("shop").style.display = "none";
}

function CheckForRent(){
  if(GameState.Spins == 0){
    //Time to pay that rent!
    if(GameState.PlayerCoins >= RentPayChecks[GameState.RentsPaid]){
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
function ShowSymbols(){
  symbolsDiv.innerHTML = "<h2>Symbols:</h2>"
  //Get symbols that were spun
  let symbolHolds = [];
  for (let i=0; i<GameState.Board.length; i++){
    symbolHolds.push({
      "payout":GameState.Board[i].payout,
      "description":GameState.Board[i].description,
      "src":GameState.Board[i].src,
      "lastPayout":GameState.Board[i].lastPayout
    })
  }

  /*
  //Get symbols that were not spun but that are in the deck, potentially with stacking
  let shownNames = [];
  let stackedSymbols = [];
  for (let i=0; i<GameState.Board.length; i++){
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
  */
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
  console.log("Error found")
  alert("Testing started. If you didn't mean to do this, you've encountered a bug! Congratulations!")
  GameState.hasTester = true;
}

