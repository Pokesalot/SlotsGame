cd $PSScriptRoot
$hold = gc .\Symbols.json | ConvertFrom-Json
$out = @{}
$hold | %{ 
    $out[$_[0]] = @{
        "Name"=$_[0]
        "Rarity"=$_[1]
        "Payout"=$_[2]
        "Description"=$_[3]
        "Effects"=@("")
        "Tags"=@("")
    } 
}
$out = $out.GetEnumerator() | sort -Property name
$out | ConvertTo-Json # | Out-File "Symbols2.json"