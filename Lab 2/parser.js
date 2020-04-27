"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let antlr4 = require('./antlr4');
let Lexer = require('./gramLexer.js').gramLexer;
let Parser = require('./gramParser.js').gramParser;
let asmCode = [];
var VarType;
(function (VarType) {
    VarType[VarType["INTEGER"] = 0] = "INTEGER";
    VarType[VarType["FPNUM"] = 1] = "FPNUM";
})(VarType || (VarType = {}));
class Token {
    constructor(sym, line, lexeme) {
        this.sym = sym;
        this.line = line;
        this.lexeme = lexeme;
    }
    toString() {
        return `${this.sym} ${this.line} ${this.lexeme}`;
    }
}
class TreeNode {
    constructor(sym, token) {
        this.sym = sym;
        this.token = token;
        this.children = [];
    }
    toString() {
        function walk(n, callback) {
            callback(n);
            n.children.forEach((x) => {
                walk(x, callback);
            });
        }
        let L = [];
        L.push("digraph d{");
        L.push(`node [fontname="Helvetica",shape=box];`);
        let counter = 0;
        walk(this, (n) => {
            n.NUMBER = "n" + (counter++);
            let tmp = n.sym;
            if (n.token) {
                tmp += "\n";
                tmp += n.token.lexeme;
            }
            tmp = tmp.replace(/&/g, "&amp;");
            tmp = tmp.replace(/</g, "&lt;");
            tmp = tmp.replace(/>/g, "&gt;");
            tmp = tmp.replace(/\n/g, "<br/>");
            L.push(`${n.NUMBER} [label=<${tmp}>];`);
        });
        walk(this, (n) => {
            n.children.forEach((x) => {
                L.push(`${n.NUMBER} -> ${x.NUMBER};`);
            });
        });
        L.push("}");
        return L.join("\n");
    }
}
class ErrorHandler {
    syntaxError(rec, sym, line, column, msg, e) {
        console.log("Syntax error:", msg, "on line", line, "at column", column);
        throw new Error("Syntax error in ANTLR parse");
    }
}
function ICE() {
    //ICE() = Internal Compiler Error (return error message)
    throw new Error("Internal Compiler Error! Wrong symbol!");
}
//ASM Stuff
function emit(instr) {
    asmCode.push(instr);
}
function makeAsm(root) {
    asmCode = [];
    labelCounter = 0;
    emit("default rel");
    emit("section .text");
    emit("global main");
    emit("main:");
    programNodeCode(root.children[0]);
    emit("ret");
    emit("section .data");
    return asmCode.join("\n");
}
function programNodeCode(n) {
    //program -> braceblock
    if (n.sym != "program")
        ICE();
    braceblockNodeCode(n.children[0]);
}
function braceblockNodeCode(n) {
    //braceblock -> LBR stmts RBR
    stmtsNodeCode(n.children[1]);
}
function stmtsNodeCode(n) {
    //stmts -> stmt stmts | lambda
    if (n.children.length == 0 || n.children[0].sym == "lambda")
        return;
    stmtNodeCode(n.children[0]);
    stmtsNodeCode(n.children[1]);
}
function stmtNodeCode(n) {
    //stmt -> cond | loop | return-stmt SEMI
    let c = n.children[0];
    switch (c.sym) {
        case "cond":
            condNodeCode(c);
            break;
        case "loop":
            loopNodeCode(c);
            break;
        case "returnStmt":
            returnstmtNodeCode(c);
            break;
        default:
            ICE();
    }
}
function returnstmtNodeCode(n) {
    //return-stmt -> RETURN expr
    let retType = exprNodeCode(n.children[1]); //...move result from expr to rax...
    if (retType == VarType.INTEGER) {
        emit("pop rax");
        emit("ret");
    }
    else if (retType == VarType.FPNUM) {
        emit("movq xmm0, [rsp]");
        emit("add rsp, 8");
        emit("cvtsd2si rax, xmm0");
        emit("ret");
    }
}
function exprNodeCode(n) {
    //expr -> NUM
    //let d = parseInt(n.children[0].token.lexeme, 10);
    //emit(`push qword ${d}`);
    //expr -> orexp
    return orexpNodeCode(n.children[0]);
}
let labelCounter = 0;
function label() {
    let s = "lbl" + labelCounter;
    labelCounter++;
    return s;
}
function condNodeCode(n) {
    //cond -> IF LP expr RP braceblock | IF LP expr RP braceblock ELSE braceblock
    if (n.children.length === 5) {
        //no 'else'
        exprNodeCode(n.children[2]); //leaves result in rax
        emit("pop rax");
        emit("cmp rax, 0");
        var endifLabel = label();
        emit(`je ${endifLabel}`);
        braceblockNodeCode(n.children[4]);
        emit(`${endifLabel}:`);
    }
    else {
        /*
        compare values
        if 0, jump to top of else
        top of if
        code
        jump to bottom of else
        top of else
        code
        bottom of else
        the rest*/
        //if
        exprNodeCode(n.children[2]);
        var endifLabel = label();
        var endElseLabel = label();
        emit("pop rax");
        emit("cmp rax, 0");
        emit(`je ${endifLabel}`); //if 0, jump to top else
        braceblockNodeCode(n.children[4]); //}
        emit(`jmp ${endElseLabel}`); //jump to bottom of else
        emit(`${endifLabel}:`); //end if
        //else
        braceblockNodeCode(n.children[6]);
        emit(`${endElseLabel}:`);
    }
}
function loopNodeCode(n) {
    //loop : WHILE LP expr RP braceblock ;
    //FINISH ME!!
    /*
    start of loop
    condition, if 1 jump out of loop
    code to execute
    jump to start of loop
    out of loop
    */
    var whileLabel, endWhileLabel = label();
    emit(`${whileLabel}:`); //start of loop
    exprNodeCode(n.children[2]);
    emit("pop rax");
    emit("cmp rax, 0"); //if condition = 1 jump out
    emit(`je ${endWhileLabel}`);
    braceblockNodeCode(n.children[4]); //code to execute
    emit(`jmp ${whileLabel}`); //jump to start
    emit(`${endWhileLabel}:`); //exit loop
}
//Expressions Stuff
//******************************************************
function factorNodeCode(n) {
    //factor -> NUM | FPNUM | LP expr RP | cast
    if (n === undefined)
        throw new Error("n is undefined!");
    if (n.sym !== "factor")
        throw new Error("n is not a factor!");
    let child = n.children[0];
    switch (child.sym) {
        case "NUM":
            let v = parseInt(child.token.lexeme, 10);
            emit(`push qword ${v}`);
            return VarType.INTEGER;
        case "FPNUM":
            let f = parseFloat(child.token.lexeme);
            let f_string = f.toString();
            if (!f_string.includes(".")) {
                f_string = f_string.concat(".0");
            }
            emit(`mov rax, __float64__ (${f_string})`);
            emit("push rax");
            return VarType.FPNUM;
        case "LP":
            return exprNodeCode(n.children[1]);
        case "cast":
            return castNodeCode(child);
        default:
            ICE();
    }
}
function castNodeCode(n) {
    //cast -> LP ID RP factor
    if (n.children.length === 1)
        return factorNodeCode(n.children[0]);
    else {
        let castType = castNodeCode(n.children[3]);
        switch (n.children[1].token.lexeme) {
            case "int":
                if (castType == VarType.INTEGER) {
                    return VarType.INTEGER;
                }
                else {
                    //int to float
                    emit("movq xmm0, [rsp]");
                    emit("add rsp, 8");
                    emit("roundsd xmm0, xmm0, 3");
                    emit("cvtsd2si rax, xmm0");
                    emit("push rax");
                    return VarType.INTEGER;
                }
            case "double":
                if (castType == VarType.FPNUM) {
                    return VarType.FPNUM;
                }
                else {
                    //float to int
                    emit("pop rax");
                    emit("cvtsi2sd xmm0, rax");
                    emit("sub rsp, 8");
                    emit("movq[rsp], xmm0");
                    return VarType.FPNUM;
                }
            default: ICE();
        }
        //do the casts (pop, convert, push)
        //float to int (pop as xmm, push with rax)
        //round floats before the convert
    }
}
function sumNodeCode(n) {
    //sum -> sum PLUS term | sum MINUS term | term
    if (n.children.length === 1)
        return termNodeCode(n.children[0]);
    else {
        let sumType = sumNodeCode(n.children[0]);
        let termType = termNodeCode(n.children[2]);
        if (sumType != termType)
            ICE();
        if (sumType == VarType.INTEGER && termType == VarType.INTEGER) {
            emit("pop rbx"); //second operand
            emit("pop rax"); //first operand
            switch (n.children[1].sym) {
                case "PLUS":
                    emit("add rax, rbx");
                    break;
                case "MINUS":
                    emit("sub rax, rbx");
                    break;
                default:
                    ICE();
            }
            emit("push rax"); //leave result on stack
            return VarType.INTEGER; //return synthesized attribute
        }
        else if (sumType == VarType.FPNUM && termType == VarType.FPNUM) {
            //pop second operand
            emit("movq xmm1, [rsp]");
            emit("add rsp, 8");
            //pop first operand
            emit("movq xmm0, [rsp]");
            emit("add rsp, 8");
            switch (n.children[1].sym) {
                case "PLUS":
                    emit("addsd xmm0, xmm1");
                    break;
                case "MINUS":
                    emit("subsd xmm0, xmm1");
                    break;
                default:
                    ICE();
            }
            //push to stack
            emit("sub rsp, 8");
            emit("movq[rsp], xmm0");
            return VarType.FPNUM; //return synthesized attribute
        }
        else {
            throw new Error("Mismatched VarTypes!");
        }
    }
}
function termNodeCode(n) {
    //term : term MULOP neg | neg ;
    if (n.children.length === 1)
        return negNodeCode(n.children[0]);
    else {
        let termType = termNodeCode(n.children[0]);
        let negType = negNodeCode(n.children[2]);
        if (termType != negType)
            ICE();
        if (termType == VarType.INTEGER && negType == VarType.INTEGER) {
            emit("pop rbx"); //second operand
            emit("pop rax"); //first operand
            switch (n.children[1].sym) {
                case "MULOP":
                    if (n.children[1].token.lexeme == "*") {
                        emit("imul rax, rbx");
                        emit("push rax");
                        break;
                    }
                    else if (n.children[1].token.lexeme == "/") {
                        emit("xor qword rdx, rdx");
                        emit("mov rdx, 0");
                        emit("idiv rbx");
                        emit("push rax"); //leave result on stack
                        break;
                    }
                    else if (n.children[1].token.lexeme == "%") {
                        emit("xor qword rdx, rdx");
                        emit("idiv rbx");
                        emit("push rdx"); //push remainder onto stack
                        break;
                    }
                default:
                    ICE();
            }
            return VarType.INTEGER; //return synthesized attribute
        }
        else if (termType == VarType.FPNUM && negType == VarType.FPNUM) {
            //pop 2nd operand
            emit("movq xmm1, [rsp]");
            emit("add rsp, 8");
            //pop 1st operand
            emit("movq xmm0, [rsp]");
            emit("add rsp, 8");
            switch (n.children[1].sym) {
                case "MULOP":
                    if (n.children[1].token.lexeme == "*") {
                        emit("mulsd xmm0, xmm1");
                        break;
                    }
                    else if (n.children[1].token.lexeme == "/") {
                        emit("divsd xmm0, xmm1");
                        break;
                    }
                    else if (n.children[1].token.lexeme == "%") {
                        emit("divsd xmm0, xmm1");
                        break;
                    }
                default:
                    ICE();
            }
            emit("sub rsp, 8");
            emit("movq[rsp], xmm0");
            return VarType.FPNUM; //return synthesized attribute
        }
        else {
            throw new Error("Mismatched VarTypes!");
        }
    }
}
function moveRAXtoXMM(input) {
    emit("pop rax");
    emit(`movq ${input}, rax`);
}
function moveXMMtoRAX(input) {
    emit(`movq rax, ${input}`);
    emit("push rax");
}
function relNodeCode(n) {
    //rel : sum RELOP sum | sum ;
    if (n.children.length === 1)
        return sumNodeCode(n.children[0]);
    else {
        let sum1Type = sumNodeCode(n.children[0]);
        let sum2Type = sumNodeCode(n.children[2]);
        if (sum1Type != sum2Type)
            ICE();
        if (sum1Type == VarType.INTEGER && sum2Type == VarType.INTEGER) {
            emit("pop rax"); //second operand
            //first operand is on stack
            emit("cmp [rsp],rax"); //do the compare
            switch (n.children[1].token.lexeme) {
                case ">=":
                    emit("setge al");
                    break;
                case "<=":
                    emit("setle al");
                    break;
                case ">":
                    emit("setg  al");
                    break;
                case "<":
                    emit("setl  al");
                    break;
                case "==":
                    emit("sete  al");
                    break;
                case "!=":
                    emit("setne al");
                    break;
                default: ICE();
            }
            emit("movzx qword rax, al"); //move with zero extend
            emit("mov [rsp], rax");
            return VarType.INTEGER;
        }
        else if (sum1Type == VarType.FPNUM && sum2Type == VarType.FPNUM) {
            moveRAXtoXMM("xmm1");
            moveRAXtoXMM("xmm0");
            //pop 2nd operand
            //emit("movq xmm1, [rsp]");
            //emit("add rsp, 8");
            //pop 1st operand
            //emit("movq xmm0, [rsp]");
            //emit("add rsp, 8");
            //compares
            switch (n.children[1].token.lexeme) {
                case ">=":
                    emit("cmpnltsd xmm0, xmm1");
                    break;
                case "<=":
                    emit("cmplesd xmm0, xmm1");
                    break;
                case ">":
                    emit("cmpnlesd  xmm0, xmm1");
                    break;
                case "<":
                    emit("cmpltsd  xmm0, xmm1");
                    break;
                case "==":
                    emit("cmpeqsd  xmm0, xmm1");
                    break;
                case "!=":
                    emit("cmpneqsd xmm0, xmm1");
                    break;
                default: ICE();
            }
            emit("movq rax, xmm0");
            emit("mov rbx, __float64__ (1.0)");
            emit("and rax, rbx");
            emit("push rax");
            //emit("mov [rsp], xmm0");        //store
            //emit("and qword [rsp], 1");     //keep lowest bit
            return VarType.FPNUM;
        }
        else {
            throw new Error("Mismatched VarTypes!");
        }
    }
}
function convertStackTopToZeroOrOneInteger(type) {
    if (type == VarType.INTEGER) {
        emit("cmp qword [rsp], 0");
        emit("setne al");
        emit("movzx rax, al");
        emit("mov [rsp], rax");
    }
    else if (type == VarType.FPNUM) {
        emit("movq xmm1, [rsp]"); //get rhs operand
        emit("add rsp, 8"); //simulate pop
        emit("xorps xmm2, xmm2"); //xmm2 < - 0
        emit("cmpneqsd xmm1, xmm2"); //check if not equal
        emit("movq rax, xmm1"); //store to rax
        emit("and qword rax, 1");
        emit("push rax");
    }
    else {
        throw new Error("Mismatched VarTypes!");
    }
}
function orexpNodeCode(n) {
    //orexp -> orexp OR andexp | andexp
    if (n.children.length === 1)
        return andexpNodeCode(n.children[0]);
    else {
        let orexpType = orexpNodeCode(n.children[0]);
        convertStackTopToZeroOrOneInteger(orexpType);
        let lbl = label();
        emit("cmp qword [rsp], 0");
        emit(`jne ${lbl}`);
        emit("add rsp,8"); //discard left result (0)
        let andexpType = andexpNodeCode(n.children[2]);
        convertStackTopToZeroOrOneInteger(andexpType);
        emit(`${lbl}:`);
        return VarType.INTEGER; //always integer, even if float operands
    }
}
function andexpNodeCode(n) {
    //andexp : andexp AND notexp | notexp ;
    if (n.children.length === 1)
        return notexpNodeCode(n.children[0]);
    else {
        let andexpType = andexpNodeCode(n.children[0]);
        convertStackTopToZeroOrOneInteger(andexpType);
        let lbl = label();
        //stuff goes here
        emit("cmp qword [rsp], 0");
        emit(`je ${lbl}`);
        emit("add rsp, 8");
        let notexpType = notexpNodeCode(n.children[2]);
        convertStackTopToZeroOrOneInteger(notexpType);
        emit(`${lbl}:`);
        return VarType.INTEGER; //always integer, even if float operands
    }
}
function notexpNodeCode(n) {
    //notexp :  NOT notexp | rel ;
    if (n.children.length === 1)
        return relNodeCode(n.children[0]);
    else {
        let notexpType = notexpNodeCode(n.children[1]);
        convertStackTopToZeroOrOneInteger(notexpType);
        emit("xor qword [rsp], 1");
        return VarType.INTEGER; //always integer, even if float operands
    }
}
function negNodeCode(n) {
    //neg :  MINUS neg | cast;
    if (n.children.length === 1)
        return castNodeCode(n.children[0]);
    else {
        let negType = negNodeCode(n.children[1]);
        if (negType == VarType.INTEGER) {
            emit("pop rax");
            emit("xor qword rbx, rbx");
            emit("sub rbx, rax");
            emit("push rbx");
            return VarType.INTEGER;
        }
        else if (negType == VarType.FPNUM) {
            emit("movq xmm0, [rsp]"); //xmm0 < - value
            emit("xorps xmm1, xmm1"); //xmm1 < - 0
            emit("subsd xmm1, xmm0"); //xmm1 < - 0 - value = -value
            emit("movq[rsp], xmm1"); //overwrite with result
            return VarType.FPNUM;
        }
        else {
            throw new Error("Mismatched VarTypes!");
        }
    }
}
//******************************************************
function walk(parser, node) {
    let p = node.getPayload();
    if (p.ruleIndex === undefined) {
        let line = p.line;
        let lexeme = p.text;
        let ty = p.type;
        let sym = parser.symbolicNames[ty];
        if (sym === null)
            sym = lexeme.toUpperCase();
        let T = new Token(sym, line, lexeme);
        return new TreeNode(sym, T);
    }
    else {
        let idx = p.ruleIndex;
        let sym = parser.ruleNames[idx];
        let N = new TreeNode(sym, undefined);
        for (let i = 0; i < node.getChildCount(); ++i) {
            let child = node.getChild(i);
            N.children.push(walk(parser, child));
        }
        return N;
    }
}
function parse(txt) {
    let stream = new antlr4.InputStream(txt);
    let lexer = new Lexer(stream);
    let tokens = new antlr4.CommonTokenStream(lexer);
    let parser = new Parser(tokens);
    parser.buildParseTrees = true;
    //Error handling
    let handler = new ErrorHandler();
    lexer.removeErrorListeners();
    lexer.addErrorListener(handler);
    parser.removeErrorListeners();
    parser.addErrorListener(handler);
    //this assumes your start symbol is 'start'
    let antlrroot = parser.start();
    let root = walk(parser, antlrroot);
    return makeAsm(root);
}
exports.parse = parse;
//# sourceMappingURL=parser.js.map