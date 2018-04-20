module.exports = {

    getNewDeck: function(){
        var Deck = [];
        var colors = ["red", "yellow", "blue", "green"];
        colors.forEach(function(color){
           for (number = 1; number <= 6; number++){
               Deck.push(new Card(number, color));
           }
           Deck.push(new Card(-1, color));
        });
        return Deck;
    },
    
    shuffle: function(array){
    //https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    },
    
    validateCard: function(card1, card2){
        if (card1.color === card2.color){
            return true;
        } else if (card1.number == card2.number){
            return true;
        } else {
            return false;
        }
    }
    
};

    function Card(number, color){
        this.number = number;
        this.color = color;
        this.type = "normal";
        this.url = "/drawableResources/"+ color + number; 
        if (number == -1){ // lets number checking establish type
            this.type = "special";
            this.url = "/drawableResources/" + color + "knight";
        } // are there other cards like reverse and skip?
    }

/*Colors: Blue (B), Yellow (Y), Green (G), Red (R), Purple (P)
 * Numbers: 1-6 in B, Y, G, R
 * 7: One More in B, Y, G, R
 * 8: Skip in B, Y, G, R
 * 9: Reverse in B, Y, G, R
 * 10: Change Color in B, Y, G, R
 * 11: Attack 2 in B, Y, G, R
 * 12: Attack 3 in B, Y, G, R
 * Special Number: -1 in B, Y, G, R, P
 */