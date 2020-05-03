export class Grammar {

    productions: Map<string, RegExp> = new Map();
    nonTerminalSymbols: Array<string> = [];
    symbols: Array<string> = [];
    doNonterminals = false;
    stable = true;

    constructor(grammar: string) {

        let lineArray = grammar.split("\n");    //array of \n chars seperates each line


        //for loop here, put grammars into the set
        for (let i = 0; i < lineArray.length - 1; i++) {

            let curLine = lineArray[i].trim();

            if (curLine.length == 0) {
                //nonterminals
                this.doNonterminals = true;
                continue;
            }

            let symArray = lineArray[i].split("->");
            let lhs = symArray[0].trim();               //left side (nonterminal symbols)
            let rhs = symArray[1].trim();               //right side (RegEx terminals)

            if (symArray.length != 2)
                throw new Error("Invalid production!");

            if (this.productions.has(lhs) && !this.doNonterminals) {
                //terminals section, but it's a dupe
                throw new Error("Duplicate terminal!");
            }

            else if (this.productions.has(lhs) && this.doNonterminals) {
                //nonterminals section, is a dupe = combine
                let tmp = this.productions.get(lhs).source;
                tmp = tmp.concat(" | ");
                tmp = tmp.concat(rhs);
                tmp.replace("lambda", "");

                let rex = new RegExp(tmp);
                this.productions.set(lhs, rex);
            }

            else {
                //adding new value into productions
                this.productions.set(lhs, new RegExp(rhs.replace("lambda", "")));
                this.symbols.push(lhs); //symbols = expressions/vars/varDecl (LHS), productions = vars -> vars (both LHS & RHS)

                if (this.doNonterminals) {
                    this.nonTerminalSymbols.push(lhs);
                }
            }
        }

        //Error handling
        let usedSymbol: Set<String> = new Set<String>();


        //initialize usedSymbol
        for (let i = 0; i < this.nonTerminalSymbols.length; i++) {
            let tmp = this.productions.get(this.nonTerminalSymbols[i]).source;
            //expr -> LP NUM RP | ID
            //tmp = LP NUM RP | ID
            let tmp_sep = tmp.split(" | ");
            for (let j = 0; j < tmp_sep.length; j++) {
                //tmp_sep = "LP NUM RP", "ID"
                //separate on whitespace
                let wsArray = tmp_sep[j].split(" ");
                for (let k = 0; k < wsArray.length; k++) {
                    //wsArray = LP, NUM, RP
                    usedSymbol.add(wsArray[k]);
                }
            }
        }

        let usedArray = Array.from(usedSymbol.values());
        let symSet = new Set<String>(this.symbols);

        for (let i = 0; i < usedArray.length; i++) {
            //expr -> ID, but we've never seen/used ID
            if (!symSet.has(usedArray[i]) && usedArray[i] != "") {
                throw new Error("Used an undefined symbol!");
            }

        }

        for (let i = 0; i < this.symbols.length; i++) {
            //if you have the symbol, but aren't using it
            if (!usedSymbol.has(this.symbols[i]))
                throw new Error("Unused symbol!");
        }
    }

    union(set1, set2): Set<String> {
        let setA = set1;
        let setB = set2;
        return setA.add(setB);
    }

    getNullable(): Set<String> {
        let nullable = new Set<String>();   //storing LHS
        for (let i = 0; i < this.nonTerminalSymbols.length; i++) {
            //split on EVERY |, then split on Whitespaces
            //maybe make a new function for unioning a Set
            //boolean ONLY stabilizes if it gets into the 3rd if check

            let tmp = this.productions.get(this.nonTerminalSymbols[i]).source;
            let sep = tmp.split(" | ");
            for (let j = 0; j < sep.length; j++) {
                let wsArray = sep[j].split(" ");
                let allNullable = wsArray.every((sym: string) => {
                    return nullable.has(sym);
                });
                if (allNullable) {
                    if (!nullable.has(this.nonTerminalSymbols[j][0])) {
                        this.stable = false;
                        this.union(sep, wsArray);
                    }
                }
            }
        }
        return nullable;
    }
}