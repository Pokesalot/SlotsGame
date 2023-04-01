cd $PSScriptRoot

$symbols = gc .\symbols.js | ?{$_.IndexOf("extends") -gt -1} | %{$($_ -split " ")[1]}

$symbolsText = $("const AllSymbols = [$($symbols | %{return "$($_),"})]") -replace ",]","]"

"$symbolsText" | Out-File .\holdItemsSymbols.js