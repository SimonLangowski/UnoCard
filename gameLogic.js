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
    }
    
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
    }
    
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
