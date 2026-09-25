$p='c:\xampp\htdocs\rivalryBackend\EICmanusciptsapi.php'
$lines=[System.Collections.Generic.List[string]](Get-Content $p)
for($i=0; $i -lt $lines.Count; $i++){
  if($lines[$i] -match 'Show ALL manuscripts with status'){
    $j=$i+1
    while($j -lt $lines.Count -and $lines[$j] -notmatch 'AND m\.status = .under_review.'){ $j++ }
    if($j -lt $lines.Count){
      $ind='                '
      $newBlock=@(
"$ind AND m.status = 'under_review'",
"$ind AND NOT EXISTS (",
"$ind     SELECT 1 FROM manuscript_revisions mr2",
"$ind     JOIN revision_entries re2 ON re2.revision_id = mr2.id",
"$ind     WHERE mr2.manuscript_id = m.id AND re2.addressed = 0",
"$ind )"
      )
      $lines[$j]=$newBlock -join "`r`n"
      Write-Output "patched line $($j+1)"
      break
    }
  }
}
[IO.File]::WriteAllText($p, ($lines -join "`r`n")+"`r`n")
& C:\xampp\php\php.exe -l $p
