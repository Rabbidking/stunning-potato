export class Grammar {

    terminals: Map<string, RegExp> = new Map();
    productions: Map<string, string[]> = new Map();
    doTokens = false;

    constructor(grammar: string) {

        let lineArray = grammar.split("\n");    //array of \n chars seperates each line

        //for loop here, put grammars into the set
        for (let i = 0; i < lineArray.length - 1; i++) {

            let curLine = lineArray[i].trim();

            if (curLine.length > 0) {

                let symArray = lineArray[i].split("->");    //array of left/right symbols separated by the arrow
                let lhs = symArray[0].trim();               //left side (nonterminal symbols)
                let rhs = symArray[1].trim();               //right side (RegEx terminals)

                if (this.doTokens) {

                    //check Tokens

                    if (this.terminals.has(lhs))
                        throw Error("Duplicate type!");

                    else {

                        try {
                            //set terminals
                            let rex = new RegExp(rhs, "gy");    //get back rhs
                            this.terminals.set(lhs, rex);
                        }

                        catch
                        {
                            throw Error("Invalid regex!");
                        }
                    }
                }

                else {
                    //productions
                    if (this.productions.has(lhs))
                        throw Error("Duplicate production!")

                    else {
                        try {
                            let prodArray = rhs.split("|");

                            //evaluate productions (TODO)
                            let dupe = false;
                            for (let i = 0; i < this.productions.size; i++) {
                                if (this.productions[i][0] == lhs) {
                                    dupe = true;
                                    break;
                                }
                            }
                            if (dupe) {
                                throw new Error("Duplicate symbol!");
                            }
                            else {
                                if (this.terminals.has(lhs)) {
                                    for (let i = 0; i < this.productions.size; i++) {
                                        if (this.productions[i][0] == lhs) {
                                            for (let j = 0; j < rhs.length; j++) {
                                                this.productions.set(rhs, prodArray);
                                            }
                                        }
                                    }
                                }
                                else {
                                    this.productions.set(lhs, prodArray);
                                }
                                for (let i = 0; i < rhs.length; i++) {
                                    let tmp = rhs[i].split(" ");
                                    for (let j = 0; j < tmp.length; j++) {
                                        if (prodArray.includes(tmp[i].trim()) == false) {
                                            prodArray.push(tmp[i].trim());
                                        }
                                    }
                                }
                            }


                            this.productions.set(lhs, prodArray);
                        }

                        catch{
                            throw Error("Invalid production!");
                        }
                    }
                }
            }
            else if (this.doTokens)
                this.doTokens = false;
        }
    }
}
