class ElementWrapper {
    constructor(type){
        this.root = document.createElement(type);
    }
    setAttribute(name, value){
        this.root.setAttribute(name, value);
        
    }
    appendChild(component){
        this.root.appendChild(component.root);
    }
}

class TextWrapper {
    constructor(content){
        this.root = document.createTextNode(content);
    }
}

export class Component {
    constructor(){
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
    }
    setAttribute(name, value){
        this.props[name] = value;
    }
    appendChild(Component){
        this.children.push(Component);
    } 
    get root(){
        //产生一个getter
        if(!this._root) {
            this._root = this.render().root;
        } 
        return this._root;
    }
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
    parentElement.appendChild(component.root);
}  