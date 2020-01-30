export class Grammar {

    g: Set<string> = new Set();

    constructor(grammar: string) {
        let lineArray = grammar.split("\n");    //array of \n chars seperates each line

        //for loop here, put grammars into the set
        for (let i = 0; i < lineArray.length - 1; i++) {

            let symArray = lineArray[i].split("->");    //array of left/right symbols separated by the arrow
            let wsArray = symArray[0].trim();           //trims whitespace characters from regexes (store these somewhere)
            let ws2 = symArray[1].trim();

            if (this.g.has(wsArray))
                throw Error("Duplicate type!");
            else
            {
                try
                {
                    let rex = new RegExp(ws2);
                }
                catch
                {
                    throw Error("Invalid regex!");
                }
                
                this.g.add(wsArray);
            }
        }
    }


}


/*
 * ID -> \w+\n
 * NUM -> \d+
 * foo -> bar\b\n
 * ID -> [A-Z] --- flag as an ERROR!
 */