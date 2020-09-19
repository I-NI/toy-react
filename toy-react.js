const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
    constructor(){
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
        this._range = null;
    }
    setAttribute(name, value){
        this.props[name] = value;
    }
    appendChild(Component){
        this.children.push(Component);
    } 
    get vdom(){
        return this.render().vdom;
    }
    
    [RENDER_TO_DOM](range){
        this._range = range;
        //this._vdom旧的vdom
        this._vdom = this.vdom
        this._vdom[RENDER_TO_DOM](range);
    }
    update(){
        let isSameNode = (oldNode, newNode) => {
            if(oldNode.type != newNode.type){
                return false;
            }
            for(let name in newNode.props){
                if(newNode.props[name] !== oldNode.props[name]){
                    return false;
                }
            }
            if(Object.keys(oldNode.props).length > Object.keys(newNode.props).length){
                return false;                
            }
            if(newNode.type === "#text"){
                if(newNode.content !== oldNode.content){
                    return false;
                }
            }
            return true;
        }
        let update = (oldNode, newNode) =>{
            //type不同，完全重构
            //props
            //children
            //#text content
            
            //新旧节点不一样
            if(!isSameNode(oldNode, newNode)){
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            newNode._range = oldNode._range;
            
            let newChildren = newNode.vchildren;
            let oldChildren = oldNode.vchildren;
            
            if(!newChildren || !newChildren.length){
                return;
            }
            
            let tailRange = oldChildren[oldChildren.length - 1]._range;
            for(let i = 0; i < newChildren.length; i++){
                let newChild = newChildren[i];
                let oldChild = oldChildren[i];
                if(i < oldChildren.length){
                    update(oldChild, newChild);
                }else{
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset);
                    range.setEnd(tailRange.endContainer, tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
            }
            
        }
        let vdom = this.vdom;
        update(this._vdom, vdom);
        this._vdom = vdom
    }    
    /*
    //重新绘制算法
    rerender(){
        //save old range
        let oldRange = this._range;
        //put new range on the start of old range 
        let range = document.createRange();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.startContainer, oldRange.startOffset);
        this[RENDER_TO_DOM](range);
        //move the start of oldRange to the end of new range, then, remove it
        oldRange.setStart(range.endContainer, range.endOffset);
        oldRange.deleteContents();
    }
    */

    setState(newState){
        if(this.state === null || typeof this.state !== "object"){
            this.state = newState;
            this.rerender();
            return;
        }
        let merge = (oldState, newState) => {
            for(let p in newState) {
                if(oldState[p] === null || typeof oldState[p] !== "object"){
                    oldState[p] = newState[p];
                } else{
                    merge(oldState[p], newState[p]);
                }
            }
        }
        merge(this.state, newState);
        this.update();
    }
}

class ElementWrapper extends Component {
    
    constructor(type){
        super(type);
        this.type = type
        //this.root = document.createElement(type);
    }
    /*
    setAttribute(name, value){
        if(name.match(/^on([\s\S]+)$/)){
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
        } else {
            if(name === "className") {
                this.root.setAttribute("class", value);
            } else {
                this.root.setAttribute(name, value);
            }
        }
    }
    appendChild(component){
        let range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        component[RENDER_TO_DOM](range);
    }
    */
    get vdom(){
        this.vchildren = this.children.map(child => child.vdom);
        return this;
        /*
        return{
            type: this.type,
            props: this.props,
            children: this.children.map(child => child.vdom)
        }
        */
    }
    
    [RENDER_TO_DOM](range){
        this._range = range;
        
        let root = document.createElement(this.type);
        
        for(let name in this.props){
            let value = this.props[name];
            if(name.match(/^on([\s\S]+)$/)){
                root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
            } else {
                if(name === "className") {
                    root.setAttribute("class", value);
                } else {
                    root.setAttribute(name, value);
                }
            }
        }
        
        if(!this.vchildren){
            this.vchildren = this.children.map(child => child.vdom);
        }

        for(let child of this.vchildren){
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);        
            
        }
        replaceContent(range, root)
        //range.insertNode(root);
    }
}

class TextWrapper extends Component{
    constructor(content){
        super(content);
        this.type = "#text";

        this.content = content;
    }
    get vdom(){
        return this;
        /*
        return{
            type: "#text",
            content: this.content
        }
        */
    }
    
    [RENDER_TO_DOM](range){
        this._range = range;
        let root = document.createTextNode(this.content);
        replaceContent(range, root);
    }
}

function replaceContent(range, node){
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();
    
    range.setStartBefore(node);
    range.setEndAfter(node);
}

export function createElement(type, attributes, ...children){
    var e;
    //jsx 如果组件名为小写则识别为原生组件如div，webpack后会自动加引号，而如果是自定义的组件名为大写如MyComponent则不会加引号，我们认为是一个Class
    if(typeof type === "string"){
        e = new ElementWrapper(type);
    } else{
        //如果是自定义的class无法直接调用document.createElement,因此需要自己进行封装
        e = new type;
    }
  
    //let e = document.createElement(tagName);
    for (let p in attributes){
      e.setAttribute(p, attributes[p]);
    }
    let insertChildren = (children) =>{
        for(let child of children) {
            if(typeof child === "string"){
              child = new TextWrapper(child);
            }
            if(child === null){
                continue;
            }
            if(typeof child === "object" && child instanceof Array){
                insertChildren(child);
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children);
    
    return e;
  }
  
export function render(component, parentElement){
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}  