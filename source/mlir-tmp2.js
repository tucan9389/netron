const TokenType = {
    IDENTIFIER: 'IDENTIFIER',
    BOOLEAN_LITERAL: 'BOOLEAN_LITERAL',
    INTEGER_LITERAL: 'INTEGER_LITERAL',
    HEXADECIMAL_LITERAL: 'HEXADECIMAL_LITERAL',
    FLOAT_LITERAL: 'FLOAT_LITERAL',
    STRING_LITERAL: 'STRING_LITERAL',
    SYMBOL_REF_ID: 'SYMBOL_REF_ID',
    TYPE: 'TYPE',
    DENSE: 'DENSE',
    VALUE_ID: 'VALUE_ID',
    CARET_ID: 'CARET_ID',
    COLON: 'COLON',
    COMMA: 'COMMA',
    EQUAL: 'EQUAL',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    ARROW: 'ARROW',
    LBRACKET: 'LBRACKET',
    RBRACKET: 'RBRACKET',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    LESS_THAN: 'LESS_THAN',
    GREATER_THAN: 'GREATER_THAN',
    KEYWORD: 'KEYWORD',
    EOF: 'EOF',
};

class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

class Tokenizer {
    constructor(input) {
        this.input = input;
        this.position = 0;
        this.currentChar = this.input[this.position];
    }

    advance() {
        this.position++;
        if (this.position >= this.input.length) {
            this.currentChar = '';
        } else {
            this.currentChar = this.input[this.position];
        }
    }

    skipWhitespace() {
        while (this.currentChar === ' ' || this.currentChar === '\t' || this.currentChar === '\n' || this.currentChar === '\r' || this.currentChar === '\f') {
            this.advance();
        }
    }

    skipComment() {
        if (this.currentChar === '/') {
            this.advance();
            if (this.currentChar === '/') {
                while (this.currentChar && this.currentChar !== '\n') {
                    this.advance();
                }
                this.skipWhitespace();
                this.skipComment();
            } else if (this.currentChar === '*') {
                while (this.currentChar) {
                    this.advance();
                    if (this.currentChar === '*') {
                        this.advance();
                        if (this.currentChar === '/') {
                            this.advance();
                            break;
                        }
                    }
                }
                this.skipWhitespace();
                this.skipComment();
            }
        }
    }

    number() {
        let result = '';
        let type = TokenType.INTEGER_LITERAL;

        while (this.currentChar && /[0-9]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        if (this.currentChar === 'x') {
            result += this.currentChar;
            this.advance();
            type = TokenType.HEXADECIMAL_LITERAL;
            while (this.currentChar && /[0-9a-fA-F]/.test(this.currentChar)) {
                result += this.currentChar;
                this.advance();
            }
        } else if (this.currentChar === '.') {
            result += this.currentChar;
            this.advance();
            type = TokenType.FLOAT_LITERAL;
            while (this.currentChar && /[0-9]/.test(this.currentChar)) {
                result += this.currentChar;
                this.advance();
            }
            if (this.currentChar === 'e' || this.currentChar === 'E') {
                result += this.currentChar;
                this.advance();
                if (this.currentChar === '+' || this.currentChar === '-') {
                    result += this.currentChar;
                    this.advance();
                }
                while (this.currentChar && /[0-9]/.test(this.currentChar)) {
                    result += this.currentChar;
                    this.advance();
                }

                if (type === TokenType.INTEGER_LITERAL && /[.eE]/.test(this.currentChar)) {
                    type = TokenType.FLOAT_LITERAL;
                }

                if (type === TokenType.FLOAT_LITERAL && !/[.eE]/.test(this.currentChar)) {
                    return new Token(type, parseFloat(result));
                }

                if (type === TokenType.HEXADECIMAL_LITERAL && !/[x]/.test(this.currentChar)) {
                    return new Token(type, parseInt(result, 16));
                }

                return new Token(type, result);
            }
        }

        return new Token(type, parseInt(result, 10));
    }

    stringLiteral() {
        let result = '';
        this.advance();

        while (this.currentChar && this.currentChar !== '"') {
            if (this.currentChar === '\\') {
                this.advance();
                switch (this.currentChar) {
                    case 'n':
                        result += '\n';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    default:
                        result += this.currentChar;
                        break;
                }
            } else {
                result += this.currentChar;
            }
            this.advance();
        }

        if (this.currentChar === '"') {
            this.advance();
            return new Token(TokenType.STRING_LITERAL, result);
        }

        throw new Error('Unterminated string literal');
    }

    identifier() {
        let result = '';
        let opened = 0;
        let wasOpened = false;
        while (true) {
            if (!opened) {
                if (this.currentChar &&
                    (/[a-zA-Z_$<>\-.\*]/.test(this.currentChar) ||
                        /[0-9]/.test(this.currentChar))) { 
                    if (this.currentChar === '<') {
                        opened += 1;
                        wasOpened = true;
                    }
                    result += this.currentChar;
                    this.advance();
                } else {
                    break;
                }
            } else { // opened
                if (!this.currentChar) {
                    break;
                } else if (this.currentChar === '>') {
                    result += this.currentChar;
                    this.advance();
                    opened -= 1;
                    if (opened === 0) {
                        break;
                    }
                } else if (this.currentChar !== '>') {
                    if (this.currentChar === '<') {
                        opened += 1;
                    }
                    result += this.currentChar;
                    this.advance();
                }
            }
        }

        if (wasOpened) {
            if (result.startsWith('dense')) {
                console.log("result: " + result)
                return new Token(TokenType.DENSE, result);
            } else {
                return new Token(TokenType.TYPE, result);
            }
        }

        if (result.endsWith('func')) {
            return new Token(TokenType.KEYWORD, result);
        }
        
        switch (result) {
            case 'module':
            case 'func':
            case 'loc':
                return new Token(TokenType.KEYWORD, result);
            case 'true':
            case 'false':
                return new Token(TokenType.BOOLEAN_LITERAL, result === 'true');
            default:
                return new Token(TokenType.IDENTIFIER, result);
        }
    }


    symbolRefId() {
        let result = '@';
        this.advance();
        if (this.currentChar === '"') {
            result += this.stringLiteral().value;
        } else {
            while (
                this.currentChar &&
                (/[a-zA-Z_$]/.test(this.currentChar) ||
                    /[0-9]/.test(this.currentChar) ||
                    /[-.]/.test(this.currentChar))
            ) {
                result += this.currentChar;
                this.advance();
            }
            if (this.currentChar === ':' && this.peek() === ':') {
                result += this.currentChar;
                this.advance();
                result += this.currentChar;
                this.advance();
                result += this.symbolRefId().value;
            }
        }
        return new Token(TokenType.SYMBOL_REF_ID, result);
    }

    valueId() {
        let result = '';
        if (this.currentChar === '%') {
            result = '%';
        } else if (this.currentChar === '$') {
            result = '$';
        }
        this.advance();
        while (
            this.currentChar &&
            (/[a-zA-Z_$]/.test(this.currentChar) ||
                /[0-9]/.test(this.currentChar) ||
                /[-.]/.test(this.currentChar))
        ) {
            result += this.currentChar;
            this.advance();
        }
        return new Token(TokenType.VALUE_ID, result);
    }

    caretId() {
        let result = '^';
        this.advance();
    
        if (this.currentChar === ':' && this.peek() !== ':') {
            result += this.currentChar;
            this.advance();
            return new Token(TokenType.CARET_ID, result);
        }
    
        while (
            this.currentChar &&
            (/[a-zA-Z_$]/.test(this.currentChar) ||
                /[0-9]/.test(this.currentChar) ||
                /[-.]/.test(this.currentChar))
        ) {
            result += this.currentChar;
            this.advance();
        }
    
        if (this.currentChar === ':' && this.peek() === ':') {
            result += this.currentChar;
            this.advance();
            result += this.currentChar;
            this.advance();
            result += this.caretId().value;
        }
    
        return new Token(TokenType.CARET_ID, result);
    }

    numberOrShape() {
        let result = '';
        let type = TokenType.INTEGER_LITERAL;
    
        while (this.currentChar && /[0-9]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }
    
        if (this.currentChar === 'x') {
            // Read the rest of the shape
            do {
                result += this.currentChar;
                this.advance();
            } while (this.currentChar && /[0-9x]/.test(this.currentChar));
            return new Token(TokenType.SHAPE, result);
        }
    
        return new Token(type, parseInt(result, 10));
    }


    peek() {
        const nextPosition = this.position + 1;
        if (nextPosition >= this.input.length) {
            return null;
        }
        return this.input[nextPosition];
    }

    nextToken() {
        while (this.currentChar) {
            if (this.currentChar === ' ' || this.currentChar === '\t' || this.currentChar === '\n' || this.currentChar === '\r' || this.currentChar === '\f') {
                this.skipWhitespace();
                continue;
            }
            if (this.currentChar === '/') {
                this.skipComment();
                continue;
            }
            if (/[0-9]/.test(this.currentChar)) {
                return this.numberOrShape();
            }
            if (this.currentChar === '.') {
                if (/[0-9]/.test(this.peek())) {
                    return this.number();
                }
                return new Token(TokenType.KEYWORD, '.');
            }
            if (this.currentChar === '-') {
                if (/[0-9]/.test(this.peek())) {
                    return this.number();
                } else if (this.peek() === '>') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.ARROW, '->');
                }
                this.advance();
                return new Token(TokenType.KEYWORD, '-');
            }
            if (this.currentChar === '+') {
                if (/[0-9]/.test(this.peek())) {
                    return this.number();
                }
                this.advance();
                return new Token(TokenType.KEYWORD, '+');
            }
            if (this.currentChar === '"') {
                return this.stringLiteral();
            }
            if (
                /[a-zA-Z_$]/.test(this.currentChar) ||
                /[-.]/.test(this.currentChar)
            ) {
                return this.identifier();
            }
            if (this.currentChar === '@') {
                return this.symbolRefId();
            }
            if (this.currentChar === '%') {
                return this.valueId();
            }
            if (this.currentChar === '^') {
                return this.caretId();
            }
            if (this.currentChar === '=') {
                if (this.peek() === '=') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.EQUAL_EQUAL, '==');
                } else {
                    this.advance();
                    return new Token(TokenType.EQUAL, '=');
                }
            }
            if (this.currentChar === ':') {
                if (this.peek() === ':') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.DOUBLE_COLON, '::');
                }
                this.advance();
                return new Token(TokenType.COLON, ':');
            }
            if (this.currentChar === ',') {
                this.advance();
                return new Token(TokenType.COMMA, ',');
            }
            if (this.currentChar === '(') {
                this.advance();
                return new Token(TokenType.LPAREN, '(');
            }
            if (this.currentChar === ')') {
                this.advance();
                return new Token(TokenType.RPAREN, ')');
            }
            if (this.currentChar === '{') {
                this.advance();
                return new Token(TokenType.LBRACE, '{');
            }
            if (this.currentChar === '}') {
                this.advance();
                return new Token(TokenType.RBRACE, '}');
            }
            if (this.currentChar === '[') {
                this.advance();
                return new Token(TokenType.LBRACKET, '[');
            }
            if (this.currentChar === ']') {
                this.advance();
                return new Token(TokenType.RBRACKET, ']');
            }
            if (this.currentChar === '<') {
                this.advance();
                return new Token(TokenType.LESS_THAN, '<');
            }
            if (this.currentChar === '>') {
                this.advance();
                return new Token(TokenType.GREATER_THAN, '>');
            }
            
            let result = this.currentChar;
            this.advance();
            return new Token(TokenType.KEYWORD, result);
        }

        return new Token(TokenType.EOF, null);
    }
}


class Parser {
    constructor(input) {
        this.tokenizer = new Tokenizer(input);
        this.currentToken = this.tokenizer.nextToken();
    }

    read() {
        this.consumeToken(TokenType.KEYWORD, 'module');

        let attributes = {};
        // Attributes
        if (this.currentToken.value === 'attributes') {
            this.consumeToken(TokenType.IDENTIFIER, 'attributes');
            attributes = Object.assign(attributes, this.parseAttribute());
        }

        console.log("attributes: " + JSON.stringify(attributes));

        this.consumeToken(TokenType.LBRACE);

        const graph = {
            functions: [],
            operations: [],
            attributes: attributes,
        };
        
        // functions or operations
        while (this.currentToken.type !== TokenType.RBRACE) {
            console.log(this.currentToken)
            if (this.currentToken.type === TokenType.KEYWORD && this.currentToken.value.endsWith('func')) {
                // function
                console.log(" >> func ")
                const func = this.parseFunction();
                console.log(" >> func: " + JSON.stringify(func));
                graph.functions.push(func);
            } else {
                // operation
                console.log(" >> op ")
                const op = this.parseOperation();
                console.log(" >> op: " + JSON.stringify(op));
                graph.operations.push(op);
            }
        }

        this.consumeToken(TokenType.RBRACE);

        return graph;
    }

    parseFunction() {
        // func keyword
        this.consumeToken(TokenType.KEYWORD);
    
        const name = this.parseFunctionName();
    
        const inputs = this.parseFunctionInputs();

        let attributes = {};
    
        // Attributes
        if (this.currentToken.value === 'attributes') {
            this.consumeToken(TokenType.IDENTIFIER, 'attributes');
            attributes = Object.assign(attributes, this.parseAttribute());
        }
    
        let outputs = {};

        if (this.currentToken.type === TokenType.ARROW) {
            outputs = Object.assign(outputs, this.parseFunctionOutputs());
        }
        
        // Attributes
        if (this.currentToken.value === 'attributes') {
            this.consumeToken(TokenType.IDENTIFIER, 'attributes');
            attributes = Object.assign(attributes, this.parseAttribute());
        }

        console.log("------------------------------------------------")
    
        this.consumeToken(TokenType.LBRACE);
    
        // Operations
        const operations = [];
        while (this.currentToken.type !== TokenType.RBRACE) {
            console.log(this.currentToken)
            const operation = this.parseOperation();
            console.log(" >> op: " + JSON.stringify(operation));
            operations.push(operation);
        }
    
        this.consumeToken(TokenType.RBRACE);
    
        return {
            name: name,
            inputs: inputs,
            outputs: outputs,
            operations: operations,
        };
    }

    parseFunctionName() {
        const name = this.currentToken.value;
        this.consumeToken(TokenType.SYMBOL_REF_ID);
        return name;
    }
    
    parseFunctionInputs() {
        this.consumeToken(TokenType.LPAREN);
        const inputs = [];
        while (this.currentToken.type !== TokenType.RPAREN) {
            const input = {
                name: this.currentToken.value,
            };
    
            this.consumeToken(TokenType.VALUE_ID);
            this.consumeToken(TokenType.COLON);
            input.type = this.currentToken.value
            if (this.currentToken.type === TokenType.TYPE) {
                this.consumeToken(TokenType.TYPE);
            } else if (this.currentToken.type === TokenType.IDENTIFIER) {
                this.consumeToken(TokenType.IDENTIFIER);
            }

            // attribute
            if (this.currentToken.type === TokenType.LBRACE) {
                input.attributes = this.parseAttribute();
            }
            inputs.push(input);

            if (this.currentToken.type === TokenType.COMMA) {
                this.consumeToken(TokenType.COMMA);
            }
        }
        this.consumeToken(TokenType.RPAREN);
        return inputs;
    }
    
    parseFunctionOutputs() {
        this.consumeToken(TokenType.ARROW);
        const outputs = [];
    
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
            while (this.currentToken.type !== TokenType.RPAREN) {
                const output = {
                    type: this.currentToken.value,
                };
                if (this.currentToken.type === TokenType.TYPE) {
                    this.consumeToken(TokenType.TYPE);
                } else if (this.currentToken.type === TokenType.IDENTIFIER) {
                    this.consumeToken(TokenType.IDENTIFIER);
                }

                // attribute
                if (this.currentToken.type === TokenType.LBRACE) {
                    output.attributes = this.parseAttribute();
                }
                outputs.push(output);
    
                if (this.currentToken.type === TokenType.COMMA) {
                    this.consumeToken(TokenType.COMMA);
                }
            }
            this.consumeToken(TokenType.RPAREN);
        } else {
            const output = {
                type: this.currentToken.value,
            };
            if (this.currentToken.type === TokenType.TYPE) {
                this.consumeToken(TokenType.TYPE);
            } else if (this.currentToken.type === TokenType.IDENTIFIER) {
                this.consumeToken(TokenType.IDENTIFIER);
            }

            outputs.push(output);
        }
    
        return outputs;
    }
    

    parseOperationName() {
        let operationName;
    
        if (this.currentToken.type === TokenType.STRING_LITERAL) {
            operationName = this.currentToken.value;
            this.consumeToken(TokenType.STRING_LITERAL);
        } else if (this.currentToken.type === TokenType.IDENTIFIER) {
            operationName = this.currentToken.value;
            this.consumeToken(TokenType.IDENTIFIER);
            if (this.currentToken.type === TokenType.IDENTIFIER) {
                operationName += this.currentToken.value;
                this.consumeToken(TokenType.IDENTIFIER);
            }
        } else {
            throw new Error(`Unexpected token for operation name: ${JSON.stringify(this.currentToken)}`);
        }
    
        return operationName;
    }
    
    parseInputArguments() {
        const inputs = [];
    
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
        }
    
        const validTerminatingTokens = [
            TokenType.RPAREN,
            TokenType.COLON,
            TokenType.ARROW,
            TokenType.LBRACE,
            TokenType.IDENTIFIER,
            TokenType.STRING_LITERAL
        ];
    
        while (!validTerminatingTokens.includes(this.currentToken.type)) {
            console.log(this.currentToken)
            if (this.currentToken.type === TokenType.VALUE_ID) {
                inputs.push(this.currentToken.value);
                this.consumeToken(TokenType.VALUE_ID);
            } else if (this.currentToken.type === TokenType.DENSE) {
                inputs.push(this.currentToken.value);
                this.consumeToken(TokenType.DENSE);
                return { inputs };
            }
    
            if (this.currentToken.type === TokenType.COMMA) {
                this.consumeToken(TokenType.COMMA);
            }
        }
    
        if (this.currentToken.type === TokenType.RPAREN) {
            this.consumeToken(TokenType.RPAREN);
        }
    
        return { inputs };
    }
    
    parseInputArgumentTypes() {
        const inputTypes = [];
    
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
        }
    
        while (this.currentToken.type === TokenType.TYPE) {
            inputTypes.push(this.currentToken.value);
            this.consumeToken(TokenType.TYPE);
            if (this.currentToken.type === TokenType.COMMA) {
                this.consumeToken(TokenType.COMMA);
            }
        }
    
        if (this.currentToken.type === TokenType.RPAREN) {
            this.consumeToken(TokenType.RPAREN);
        }
    
        return { inputTypes };
    }
    
    
    parseOutputArguments() {
        const outputs = [];
        const outputTypes = [];
    
        this.consumeToken(TokenType.LPAREN);
    
        while (this.currentToken.type !== TokenType.RPAREN) {
            if (this.currentToken.type === TokenType.VALUE_ID) {
                outputs.push(this.currentToken.value);
                this.consumeToken(TokenType.VALUE_ID);
            }
    
            if (this.currentToken.type === TokenType.COLON) {
                this.consumeToken(TokenType.COLON);
                outputTypes.push(this.currentToken.value);
                this.consumeToken(TokenType.TYPE);
            }
    
            if (this.currentToken.type === TokenType.COMMA) {
                this.consumeToken(TokenType.COMMA);
            }
        }
    
        this.consumeToken(TokenType.RPAREN);
    
        return { outputs, outputTypes };
    }
    
    parseOutputType() {
        const outputTypes = [];
    
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
    
            while (this.currentToken.type !== TokenType.RPAREN) {
                outputTypes.push(this.currentToken.value);
                this.consumeToken(TokenType.TYPE);
    
                if (this.currentToken.type === TokenType.COMMA) {
                    this.consumeToken(TokenType.COMMA);
                }
            }
    
            this.consumeToken(TokenType.RPAREN);
        } else {
            outputTypes.push(this.currentToken.value);
            this.consumeToken(TokenType.TYPE);
        }
    
        return outputTypes;
    }

    parseOperationBody() {
        let bodyContent = '';
        let braceCount = 0;
    
        this.consumeToken(TokenType.LBRACE);
        braceCount++;
        bodyContent += '{ ';
    
        while (braceCount > 0) {
            if (this.currentToken.type === TokenType.LBRACE) {
                braceCount++;
            } else if (this.currentToken.type === TokenType.RBRACE) {
                braceCount--;
            }
    
            if (braceCount > 0) {
                bodyContent += this.currentToken.value;
                if (this.currentToken.type === TokenType.LBRACE || this.currentToken.type === TokenType.RBRACE) {
                    bodyContent += '\n';
                } else if (this.currentToken.type !== TokenType.WHITESPACE) {
                    bodyContent += ' ';
                }
            }
    
            this.consumeToken(this.currentToken.type)
        }
    
        bodyContent += '}';
    
        return bodyContent;
    }
    
    parseReturnValues() {
        const outputs = [];
    
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
            console.log(this.currentToken)
    
            while (this.currentToken.type !== TokenType.RPAREN) {
                if (this.currentToken.type === TokenType.VALUE_ID) {
                    outputs.push(this.currentToken.value);
                    this.consumeToken(TokenType.VALUE_ID);
                }
    
                if (this.currentToken.type === TokenType.COMMA) {
                    this.consumeToken(TokenType.COMMA);
                }
            }
    
            this.consumeToken(TokenType.RPAREN);
        } else if (this.currentToken.type === TokenType.VALUE_ID) {
            outputs.push(this.currentToken.value);
            this.consumeToken(TokenType.VALUE_ID);
    
            if (this.currentToken.type === TokenType.COMMA) {
                this.consumeToken(TokenType.COMMA);
    
                while (this.currentToken.type === TokenType.VALUE_ID) {
                    outputs.push(this.currentToken.value);
                    this.consumeToken(TokenType.VALUE_ID);
    
                    if (this.currentToken.type === TokenType.COMMA) {
                        this.consumeToken(TokenType.COMMA);
                    }
                }
            }
        }
    
        return outputs;
    }

    parseAttribute() {
        const attributes = {};
        if (this.currentToken.type !== TokenType.LBRACE) { return attributes }
        this.consumeToken(TokenType.LBRACE);


        while (this.currentToken.type !== TokenType.RBRACE) {
            if (this.currentToken.type === TokenType.IDENTIFIER) {
                const attributeName = this.currentToken.value;
                this.consumeToken(TokenType.IDENTIFIER);

                if (this.currentToken.type === TokenType.EQUAL) {
                    this.consumeToken(TokenType.EQUAL);
                    const attributeValue = this.parseAttributeValue();
                    attributes[attributeName] = attributeValue;
                } else {
                    attributes[attributeName] = attributeName;
                }

                if (this.currentToken.type === TokenType.COMMA) {
                    this.consumeToken(TokenType.COMMA);
                }

            } else {
                throw new Error(`Unexpected token '${this.currentToken.value}' when parsing operation attribute: ${JSON.stringify(this.currentToken)}`);
            }
        }

        this.consumeToken(TokenType.RBRACE);

        console.log("attributes: " + JSON.stringify(attributes));
        
        return attributes;
    }
    
    parseAttributeValue() {
        let value = '';

        // {affine_map_attr = affine_map<(d0, d1) -> (d0 + d1, d0 - d1)>}
    
        let openingCount = 0;
        let openingChars = [TokenType.LBRACKET, TokenType.LBRACE, TokenType.LPAREN];
        let closingChars = [TokenType.RBRACKET, TokenType.RBRACE, TokenType.RPAREN];
    
        while (
            !(openingCount === 0 && (this.currentToken.type === TokenType.COMMA || this.currentToken.type === TokenType.RBRACE))
        ) {
            if (openingChars.includes(this.currentToken.type)) {
                openingCount++;
            } else if (closingChars.includes(this.currentToken.type)) {
                openingCount--;
            }
    
            value += this.currentToken.value + ' ';
            this.consumeToken(this.currentToken.type);
        }
    
        return value.trim();
    }
    
    parseOperation() {
        // %3
        const outputs = this.parseReturnValues();
        console.log("outputs: " + JSON.stringify(outputs))
        // =
        if (this.currentToken.type == TokenType.EQUAL) {
            this.consumeToken(TokenType.EQUAL);
        }
        // "add"
        const operationName = this.parseOperationName();
        // (%a, %b)
        console.log("Start parseInputArguments")
        const { inputs } = this.parseInputArguments();
        console.log(JSON.stringify(inputs))

        // TODO: parsing ^bb
        if (this.currentToken.type === TokenType.LPAREN) {
            this.consumeToken(TokenType.LPAREN);
            let count = 1;
            while (count > 0) {
                if (this.currentToken.type === TokenType.LPAREN) {
                    count++;
                } else if (this.currentToken.type === TokenType.RPAREN) {
                    count--;
                }
                this.consumeToken(this.currentToken.type);
            }
        }

        // : (f32, tensor<1xf32>)
        let inputTypes = [];
        let attributes = {};

        attributes = Object.assign(attributes, this.parseAttribute());
        if (this.currentToken.type === TokenType.COLON) {
            this.consumeToken(TokenType.COLON);
            ({ inputTypes } = this.parseInputArgumentTypes());
        }

        const outputTypes = [];
        if (operationName.endsWith('constant') && this.currentToken.type !== TokenType.ARROW) {
            // constant
            const result = {
                name: operationName,
                attributes: attributes,
                // data: this.parseConstantData(),
                outputs: outputs,
                outputTypes: outputTypes,
                isConstant: true,
            }
        } else {
            // -> f32
            if (this.currentToken.type === TokenType.ARROW) {
                this.consumeToken(TokenType.ARROW);
                outputTypes.push(...this.parseOutputType());
            }
            
            let body = null;
            if (this.currentToken.type === TokenType.LBRACE) {
                body = this.parseOperationBody();
            }

            attributes = Object.assign(attributes, this.parseAttribute());

            const result = {
                name: operationName,
                attributes: attributes,
                inputs: inputs,
                inputTypes: inputTypes,
                outputs: outputs,
                outputTypes: outputTypes,
                body: body,
            }
        
            return result;
        }        
    }
    
    peekNextToken() {
        const savedToken = this.currentToken;
        const nextToken = this.tokenizer.nextToken();
        this.currentToken = savedToken;
        return nextToken;
    }

    consumeToken(expectedType, expectedValue) {
        if (this.currentToken.type === expectedType) {
            if (expectedValue !== undefined && this.currentToken.value !== expectedValue) {
                throw new Error(`Expected token with value '${expectedValue}', but got '${this.currentToken.value}': ${JSON.stringify(this.currentToken)}`);
            }
            this.currentToken = this.tokenizer.nextToken();
        } else {
            throw new Error(`Expected token of type '${expectedType}', but got '${this.currentToken.type}': ${JSON.stringify(this.currentToken)}`);
        }
    }
}




    const input = `

    module attributes {tf.versions = {bad_consumers = [], min_consumer = 12 : i32, producer = 440 : i32}, tf_saved_model.semantics} {
        "tf_saved_model.global_tensor"() {is_mutable, sym_name = "__sm_node4__optimizer.iter", tf_saved_model.exported_names = [], type = tensor<i64>, value = dense<0> : tensor<i64>} : () -> ()
        "tf_saved_model.global_tensor"() {sym_name = "__sm_node6__optimizer.learning_rate", tf_saved_model.exported_names = [], type = tensor<f32>, value = dense<0.00999999977> : tensor<f32>} : () -> ()
            func @__inference_predict_3320(%arg0: tensor<32x28x28x1xf32> {tf._user_specified_name = "inputs", tf_saved_model.index_path = [0]}, %arg1: tensor<32x1xf32> {tf._user_specified_name = "targets", tf_saved_model.index_path = [1]}, %arg2: tensor<!tf.resource<tensor<5x5x1x32xf32>>> {tf_saved_model.bound_input = @__sm_node17__model.conv1.kernel}, %arg3: tensor<!tf.resource<tensor<5x5x32x32xf32>>> {tf_saved_model.bound_input = @__sm_node26__model.conv2.kernel}, %arg4: tensor<!tf.resource<tensor<1568x1024xf32>>> {tf_saved_model.bound_input = @__sm_node39__model.dense1.kernel}, %arg5: tensor<!tf.resource<tensor<1024xf32>>> {tf_saved_model.bound_input = @__sm_node40__model.dense1.bias}, %arg6: tensor<!tf.resource<tensor<1024x10xf32>>> {tf_saved_model.bound_input = @__sm_node49__model.dense2.kernel}, %arg7: tensor<!tf.resource<tensor<10xf32>>> {tf_saved_model.bound_input = @__sm_node50__model.dense2.bias}, %arg8: tensor<!tf.resource<tensor<f32>>> {tf_saved_model.bound_input = @__sm_node6__optimizer.learning_rate}, %arg9: tensor<!tf.resource<tensor<i64>>> {tf_saved_model.bound_input = @__sm_node4__optimizer.iter}) -> (tensor<f32> {tf_saved_model.index_path = []}) attributes {tf._input_shapes = [#tf.shape<32x28x28x1>, #tf.shape<32x1>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>], tf.signature.is_stateful, tf_saved_model.exported_names = ["predict"]} {
                %0 = mhlo.constant dense<3.125000e-02> : tensor<32x10xf32>
                %0 = mhlo.constant dense<3.125000e-02> : tensor<32x10xf32>
              %1 = mhlo.constant dense<3.200000e+01> : tensor<f32>
              %2 = mhlo.constant dense<1> : tensor<i64>
              %14 = "tf.Cast"(%arg2) {Truncate = false} : (tensor<!tf.resource<tensor<5x5x1x32xf32>>>) -> tensor<!tf.resource>
            %27 = "mhlo.convolution"(%arg0, %22) {batch_group_count = 1 : i64, dimension_numbers = {input_batch_dimension = 0 : i64, input_feature_dimension = 3 : i64, input_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>, kernel_input_feature_dimension = 2 : i64, kernel_output_feature_dimension = 3 : i64, kernel_spatial_dimensions = dense<[0, 1]> : tensor<2xi64>, output_batch_dimension = 0 : i64, output_feature_dimension = 3 : i64, output_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>}, feature_group_count = 1 : i64, padding = dense<2> : tensor<2x2xi64>, rhs_dilation = dense<1> : tensor<2xi64>, window_strides = dense<1> : tensor<2xi64>} : (tensor<32x28x28x1xf32>, tensor<5x5x1x32xf32>) -> tensor<32x28x28x32xf32>
            %28 = mhlo.maximum %27, %11 : tensor<32x28x28x32xf32>
            %29 = "mhlo.reduce_window"(%28, %8) ( {
            ^bb0(%arg10: tensor<f32>, %arg11: tensor<f32>):  // no predecessors
              %130 = mhlo.maximum %arg10, %arg11 : tensor<f32>
              "mhlo.return"(%130) : (tensor<f32>) -> ()
            }) {padding = dense<0> : tensor<4x2xi64>, window_dimensions = dense<[1, 2, 2, 1]> : tensor<4xi64>, window_strides = dense<[1, 2, 2, 1]> : tensor<4xi64>} : (tensor<32x28x28x32xf32>, tensor<f32>) -> tensor<32x14x14x32xf32>
            %30 = "mhlo.convolution"(%29, %21) {batch_group_count = 1 : i64, dimension_numbers = {input_batch_dimension = 0 : i64, input_feature_dimension = 3 : i64, input_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>, kernel_input_feature_dimension = 2 : i64, kernel_output_feature_dimension = 3 : i64, kernel_spatial_dimensions = dense<[0, 1]> : tensor<2xi64>, output_batch_dimension = 0 : i64, output_feature_dimension = 3 : i64, output_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>}, feature_group_count = 1 : i64, padding = dense<2> : tensor<2x2xi64>, rhs_dilation = dense<1> : tensor<2xi64>, window_strides = dense<1> : tensor<2xi64>} : (tensor<32x14x14x32xf32>, tensor<5x5x32x32xf32>) -> tensor<32x14x14x32xf32>
            "tf.AssignVariableOp"(%20, %126) : (tensor<!tf.resource>, tensor<*xi64>) -> ()
            %127 = "mhlo.reduce"(%68, %12) ( {
            ^bb0(%arg10: tensor<f32>, %arg11: tensor<f32>):  // no predecessors
              %130 = mhlo.add %arg10, %arg11 : tensor<f32>
              "mhlo.return"(%130) : (tensor<f32>) -> ()
            }) {dimensions = dense<0> : tensor<1xi64>} : (tensor<32xf32>, tensor<f32>) -> tensor<f32>
            %128 = mhlo.divide %127, %1 : tensor<f32>
            %129 = "mhlo.select"(%13, %12, %128) : (tensor<i1>, tensor<f32>, tensor<f32>) -> tensor<f32>
            return %129 : tensor<f32>
          }
        }
    
    `;

// let num = 0;

// const tokenizer = new Tokenizer(input);
// let token = tokenizer.nextToken();
// while (token.type !== TokenType.EOF) {
//     console.log(token);
//     token = tokenizer.nextToken();
// }

let parser = new Parser(input);
let result = parser.read();
console.log(JSON.stringify(result, null, 2))



// const input = `
// module {
// stablehlo.func @main(%image: tensor<28x28xf32>, %weights: tensor<784x10xf32>,%bias: tensor<1x10xf32>) -> tensor<1x10xf32> {
//   %0 = "stablehlo.reshape"(%image) : (tensor<28x28xf32>) -> tensor<1x784xf32>
//   %1 = "stablehlo.dot"(%0, %weights) : (tensor<1x784xf32>, tensor<784x10xf32>) -> tensor<1x10xf32>
//   %2 = "stablehlo.add"(%1, %bias) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
//   %3 = "stablehlo.constant"() { value = dense<0.0> : tensor<1x10xf32> } : () -> tensor<1x10xf32>
//   %4 = "stablehlo.maximum"(%2, %3) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
//   "stablehlo.return"(%4): (tensor<1x10xf32>) -> ()
// }
// }
// `;


//   const input = `
//   module {
//   stablehlo.func @main(%image: tensor<28x28xf32>, %weights: tensor<784x10xf32>,%bias: tensor<1x10xf32>) -> tensor<1x10xf32> {
//     %0 = "stablehlo.reshape"(%image) : (tensor<28x28xf32>) -> tensor<1x784xf32>
//     %1 = "stablehlo.dot"(%0, %weights) : (tensor<1x784xf32>, tensor<784x10xf32>) -> tensor<1x10xf32>
//     %2 = "stablehlo.add"(%1, %bias) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
//     %3 = "stablehlo.constant"() { value = dense<0.0> : tensor<1x10xf32> } : () -> tensor<1x10xf32>
//     %4 = "stablehlo.maximum"(%2, %3) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
//     "stablehlo.return"(%4): (tensor<1x10xf32>) -> ()
//   }
//   }
//   `;

/**
 module attributes {tf.versions = {bad_consumers = [], min_consumer = 12 : i32, producer = 440 : i32}, tf_saved_model.semantics} {
"tf_saved_model.global_tensor"() {is_mutable, sym_name = "__sm_node4__optimizer.iter", tf_saved_model.exported_names = [], type = tensor<i64>, value = dense<0> : tensor<i64>} : () -> ()
    "tf_saved_model.global_tensor"() {sym_name = "__sm_node6__optimizer.learning_rate", tf_saved_model.exported_names = [], type = tensor<f32>, value = dense<0.00999999977> : tensor<f32>} : () -> ()
    func @__inference_predict_3320(%arg0: tensor<32x28x28x1xf32> {tf._user_specified_name = "inputs", tf_saved_model.index_path = [0]}, %arg1: tensor<32x1xf32> {tf._user_specified_name = "targets", tf_saved_model.index_path = [1]}, %arg2: tensor<!tf.resource<tensor<5x5x1x32xf32>>> {tf_saved_model.bound_input = @__sm_node17__model.conv1.kernel}, %arg3: tensor<!tf.resource<tensor<5x5x32x32xf32>>> {tf_saved_model.bound_input = @__sm_node26__model.conv2.kernel}, %arg4: tensor<!tf.resource<tensor<1568x1024xf32>>> {tf_saved_model.bound_input = @__sm_node39__model.dense1.kernel}, %arg5: tensor<!tf.resource<tensor<1024xf32>>> {tf_saved_model.bound_input = @__sm_node40__model.dense1.bias}, %arg6: tensor<!tf.resource<tensor<1024x10xf32>>> {tf_saved_model.bound_input = @__sm_node49__model.dense2.kernel}, %arg7: tensor<!tf.resource<tensor<10xf32>>> {tf_saved_model.bound_input = @__sm_node50__model.dense2.bias}, %arg8: tensor<!tf.resource<tensor<f32>>> {tf_saved_model.bound_input = @__sm_node6__optimizer.learning_rate}, %arg9: tensor<!tf.resource<tensor<i64>>> {tf_saved_model.bound_input = @__sm_node4__optimizer.iter}) -> (tensor<f32> {tf_saved_model.index_path = []}) attributes {tf._input_shapes = [#tf.shape<32x28x28x1>, #tf.shape<32x1>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>, #tf.shape<*>], tf.signature.is_stateful, tf_saved_model.exported_names = ["predict"]} {
        %0 = mhlo.constant dense<3.125000e-02> : tensor<32x10xf32>
        %0 = mhlo.constant dense<3.125000e-02> : tensor<32x10xf32>
      %1 = mhlo.constant dense<3.200000e+01> : tensor<f32>
      %2 = mhlo.constant dense<1> : tensor<i64>
      %14 = "tf.Cast"(%arg2) {Truncate = false} : (tensor<!tf.resource<tensor<5x5x1x32xf32>>>) -> tensor<!tf.resource>
    %27 = "mhlo.convolution"(%arg0, %22) {batch_group_count = 1 : i64, dimension_numbers = {input_batch_dimension = 0 : i64, input_feature_dimension = 3 : i64, input_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>, kernel_input_feature_dimension = 2 : i64, kernel_output_feature_dimension = 3 : i64, kernel_spatial_dimensions = dense<[0, 1]> : tensor<2xi64>, output_batch_dimension = 0 : i64, output_feature_dimension = 3 : i64, output_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>}, feature_group_count = 1 : i64, padding = dense<2> : tensor<2x2xi64>, rhs_dilation = dense<1> : tensor<2xi64>, window_strides = dense<1> : tensor<2xi64>} : (tensor<32x28x28x1xf32>, tensor<5x5x1x32xf32>) -> tensor<32x28x28x32xf32>
    %28 = mhlo.maximum %27, %11 : tensor<32x28x28x32xf32>
    %29 = "mhlo.reduce_window"(%28, %8) ( {
    ^bb0(%arg10: tensor<f32>, %arg11: tensor<f32>):  // no predecessors
      %130 = mhlo.maximum %arg10, %arg11 : tensor<f32>
      "mhlo.return"(%130) : (tensor<f32>) -> ()
    }) {padding = dense<0> : tensor<4x2xi64>, window_dimensions = dense<[1, 2, 2, 1]> : tensor<4xi64>, window_strides = dense<[1, 2, 2, 1]> : tensor<4xi64>} : (tensor<32x28x28x32xf32>, tensor<f32>) -> tensor<32x14x14x32xf32>
    %30 = "mhlo.convolution"(%29, %21) {batch_group_count = 1 : i64, dimension_numbers = {input_batch_dimension = 0 : i64, input_feature_dimension = 3 : i64, input_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>, kernel_input_feature_dimension = 2 : i64, kernel_output_feature_dimension = 3 : i64, kernel_spatial_dimensions = dense<[0, 1]> : tensor<2xi64>, output_batch_dimension = 0 : i64, output_feature_dimension = 3 : i64, output_spatial_dimensions = dense<[1, 2]> : tensor<2xi64>}, feature_group_count = 1 : i64, padding = dense<2> : tensor<2x2xi64>, rhs_dilation = dense<1> : tensor<2xi64>, window_strides = dense<1> : tensor<2xi64>} : (tensor<32x14x14x32xf32>, tensor<5x5x32x32xf32>) -> tensor<32x14x14x32xf32>
    "tf.AssignVariableOp"(%20, %126) : (tensor<!tf.resource>, tensor<*xi64>) -> ()
    %127 = "mhlo.reduce"(%68, %12) ( {
    ^bb0(%arg10: tensor<f32>, %arg11: tensor<f32>):  // no predecessors
      %130 = mhlo.add %arg10, %arg11 : tensor<f32>
      "mhlo.return"(%130) : (tensor<f32>) -> ()
    }) {dimensions = dense<0> : tensor<1xi64>} : (tensor<32xf32>, tensor<f32>) -> tensor<f32>
    %128 = mhlo.divide %127, %1 : tensor<f32>
    %129 = "mhlo.select"(%13, %12, %128) : (tensor<i1>, tensor<f32>, tensor<f32>) -> tensor<f32>
    return %129 : tensor<f32>
  }
}


 */

// const input = `
// // Compute A*B using an implementation of multiply kernel and print the
// // result using a TensorFlow op. The dimensions of A and B are partially
// // known. The shapes are assumed to match.
// func.func @mul(%A: tensor<100x?xf32>, %B: tensor<?x50xf32>) -> (tensor<100x50xf32>) {
//   // Compute the inner dimension of %A using the dim operation.
//   %n = memref.dim %A, 1 : tensor<100x?xf32>

//   // Allocate addressable "buffers" and copy tensors %A and %B into them.
//   %A_m = memref.alloc(%n) : memref<100x?xf32>
//   memref.tensor_store %A to %A_m : memref<100x?xf32>

//   %B_m = memref.alloc(%n) : memref<?x50xf32>
//   memref.tensor_store %B to %B_m : memref<?x50xf32:<>>

//   // Call function @multiply passing memrefs as arguments,
//   // and getting returned the result of the multiplication.
//   %C_m = call @multiply(%A_m, %B_m)
//           : (memref<100x?xf32>, memref<?x50xf32>) -> (memref<100x50xf32>)

//   memref.dealloc %A_m : memref<100x?xf32>
//   memref.dealloc %B_m : memref<?x50xf32>

//   // Load the buffer data into a higher level "tensor" value.
//   %C = memref.tensor_load %C_m : memref<100x50xf32>
//   memref.dealloc %C_m : memref<100x50xf32>

//   // Call TensorFlow built-in function to print the result tensor.
//   "tf.Print"(%C){message: "mul result"} : (tensor<100x50xf32>) -> (tensor<100x50xf32>)

//   return %C : tensor<100x50xf32>
// }

    
//     `


/**
%0 = "stablehlo.reshape"(%image) : (tensor<28x28xf32>) -> tensor<1x784xf32>
        %1 = dot %0, %weights : (tensor<1x784xf32>, tensor<784x10xf32>) -> tensor<1x10xf32>
        %0 = "operation1"(%input1, %input2) : (tensor<2x2xf32>, tensor<2x2xf32>) -> tensor<2x2xf32>
        %1 = "operation1"(%0, %input3) : (tensor<2x2xf32>, tensor<2x2xf32>) -> tensor<2x2xf32>
        %2 = "operation2" : () -> tensor<2x2xf32>
        %3 = "operation3"() : () -> tensor<2x2xf32>
        %4 = "operation4"(%input4) : (tensor<2x2xf32>) -> ()
        %5 = operation5(%input1, %input2) : (tensor<2x2xf32>, tensor<2x2xf32>) -> tensor<2x2xf32>
        %6 = operation6 : () -> tensor<2x2xf32>
        %7 = operation7() : () -> tensor<2x2xf32>
        operation8(%input1) : (tensor<2x2xf32>) -> ()
        op
        op %input : tensor<2x3xf32>
        op (%input1, %input2) : tensor<2x3xf32>, tensor<2x3xf32>
        op (%input1, %input2) : tensor<2x3xf32>, tensor<2x3xf32> {
        ^metadata_key = metadata_value
        %temp1 = "other_op"(%input1) : tensor<2x3xf32> -> tensor<2x3xf32>
        %temp2 = "yet_another_op"(%input2) : tensor<2x3xf32> -> tensor<2x3xf32>
        "return_op"(%temp1, %temp2) : tensor<2x3xf32>, tensor<2x3xf32> -> ()
        }
        op %input : tensor<2x3xf32> {
        ^metadata_key = metadata_value
        "op1"(%input) : tensor<2x3xf32> -> tensor<2x3xf32>
        }
 */

        /*


        module {
    
      func @my_function(%arg0: memref<32x32xf32>) attributes {affine_map_attr = affine_map<(d0, d1) -> (d0 + d1, d0 - d1)>} {
        // function body
      }
      func @my_function() attributes {array_attr = [1, 2, 3]} {
        // function body
      }
      func @my_function() attributes {nested_attr = {inner_attr1 = true, inner_attr2 = 3.14 : f64}} {
        // function body
      }
      func @my_function(%arg0: f32, %arg1: f32) -> f32 attributes {attr1 = "value", attr2 = 42 : i32, attr3 = dense<[1, 2, 3]> : tensor<3xi32>} {
        // function body
      }

      stablehlo.func @main(%image: tensor<28x28xf32>, %weights: tensor<784x10xf32>,%bias: tensor<1x10xf32>) -> tensor<1x10xf32> {
        %99 = "mhlo.broadcast_in_dim"(%41) {broadcast_dimensions = dense<> : tensor<0xi64>} : (tensor<f32>) -> tensor<5x5x32x32xf32>
        %98 = "mhlo.broadcast_in_dim"(%41) : (tensor<f32>) -> tensor<5x5x32x32xf32> {broadcast_dimensions = dense<> : tensor<0xi64>}
        "stablehlo.return"(%1): (tensor<1x10xf32>) -> ()
    }


      func @example(%arg1: i32, %arg2: i32) -> (i32) { }
    func @example(%arg1: i32, %arg2: i32) -> (i32, i32) { }
    func @example(%arg1: i32, %arg2: i32) -> i32 { }

    }
    */