const fs=require('fs');
const path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'..','stage2-professional-description-ui.js'),'utf8');
const order=['1. Identyfikacja','2. Odmiana i cechy rozstrzygające','3. Literatura i katalogi','4. Rzadkość','5. Cechy konkretnego egzemplarza','6. Notowania i kontekst rynkowy','7. Wycena','8. Uwagi i ograniczenia','Opis APOMONET'];
let last=-1;for(const label of order){const i=ui.indexOf(label);if(i<0)throw new Error('Brak sekcji: '+label);if(i<=last)throw new Error('Nieprawidłowa kolejność sekcji: '+label);last=i;}
if(!ui.includes("historyczna wartość katalogowa"))throw new Error('Tyszkiewicz nie jest oznaczony jako historyczna wartość katalogowa');
if(ui.includes('Tyszkiewicz')&&ui.includes('współczesna wycena Tyszkiewicza'))throw new Error('Tyszkiewicz nie może być przedstawiany jako współczesna wycena');
if(!ui.includes("Brak potwierdzonego odniesienia katalogowego"))throw new Error('Brak bezpiecznego fallbacku bez wymyślonego katalogu');
console.log('stage2-professional-description.test.js OK');
