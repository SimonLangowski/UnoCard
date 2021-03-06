module.exports = {

    getNewDeck: function(){
        var Deck = [];
        var colors = ["red", "yellow", "blue", "green"];
        colors.forEach(function(color){
           for (number = 1; number <= 12; number++){
               Deck.push(new Card(number, color));
           }
        });
        Deck.push(new Card(13, "blue"));
        Deck.push(new Card(14, "yellow"));
        Deck.push(new Card(15, "green"));
        Deck.push(new Card(16, "red"));
        Deck.push(new Card(17, "purple"));
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

    //NOTE: The purple card always goes back into the deck when played
    validateCard: function (topCard, card, attackCount) {
        if ((topCard.number >= 1 && topCard.number <= 9) || topCard.number == 13 || topCard.number == 14) {
            if (topCard.color == card.color) {
                return true;
            } else if (topCard.number == card.number) {
                return true;
            } else if (card.color == "purple") {
                return true;
            } else {
                return false;
            }
        } else if (topCard.number == 11) {
            if (card.number == 11 || card.number == 12 || card.number == 16 || card.number == 17) {
                return true;
            } else if (card.number == 14 && attackCount != 0) {
                return true;
            } else if (topCard.color == card.color && attackCount == 0) {
                return true;
            } else {
                return false;
            }
        } else if (topCard.number == 12) {
            if (card.number == 12 || card.number == 16 || card.number == 17) {
                return true;
            } else if (card.number == 14 && attackCount != 0) {
                return true;
            } else if (topCard.color == card.color && attackCount == 0) {
                return true;
            } else {
                return false;
            }
        } else if (topCard.number == 16) {
            if (card.number == 17) {
                return true;
            } else if (card.number == 14 && attackCount != 0) {
                return true;
            } else if (topCard.color == card.color && attackCount == 0) {
                return true;
            } else {
                return false;
            }
        } else if (topCard.number == 10 || topCard.number == 15) {
            if (topCard.setColor == card.color) {
                return true;
            } else if (topCard.number == card.number) {
                return true;
            } else if (card.color == "purple") {
                return true;
            } else {
                return false;
            }
        }
    },

    drawCard: function (deck, hand, numCards) {
        for (i = 0; i < numCards; i++) {
            hand.push(deck.pop());
        }
    },

    putHandIntoDeck: function (deck, hand) {
        var number = hand.length;
        for (i = 0; i < number; i++) {
            deck.push(hand.pop());
        }
        module.exports.shuffle(deck);
    },

    putCardIntoDeck: function (deck, card) {
        deck.push(card);
        module.exports.shuffle(deck);
    },

    putCardsIntoDeck: function (deck, cards, numCards) {
        for (i = 0; i < numCards; i++) {
            deck.push(cards.pop());
        }
        module.exports.shuffle(deck);
    }
    
};

    function Card(number, color){
        this.number = number;
        this.color = color;
        this.setColor = color;
        this.type = "normal";
        this.url = "/drawingResources/"+ color + number + ".png"; 
        if (number == 13) {
            this.type = "special";
            this.url = "/drawingResources/" + "blueknight" + ".png";
        } else if (number == 14) {
            this.type = "special";
            this.url = "/drawingResources/" + "yellowknight" + ".png";
        } else if (number == 15) {
            this.type = "special";
            this.url = "/drawingResources/" + "greenknight" + ".png";
        } else if (number == 16) {
            this.type = "special";
            this.url = "/drawingResources/" + "redknight" + ".png";
        } else if (number == 17) {
            this.type = "special";
            this.url = "/drawingResources/" + "purpleknight" + ".png";
        }
    }

/*Colors: Blue (B), Yellow (Y), Green (G), Red (R), Purple (P)
 * Numbers: 1-6 in B, Y, G, R
 * 7: One More in B, Y, G, R
 * 8: Skip in B, Y, G, R
 * 9: Reverse in B, Y, G, R
 * 10: Change Color in B, Y, G, R 
 * 11: Attack 2 in B, Y, G, R
 * 12: Attack 3 in B, Y, G, R
 * 13: Blue Special
 * 14: Yellow Special
 * 15: Green Special  
 * 16: Red Special       
 * 17: Purple Special
 */