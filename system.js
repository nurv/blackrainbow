(function () {
    var clone = function(a) {
      var newObj = (a instanceof Array) ? [] : {};
      for (var i in a) {
        if (i == 'clone') continue;
        if (a[i] && typeof a[i] == "object") {
          newObj[i] = clone(a[i]);
        } else newObj[i] = a[i]
      } return newObj;
    };
  
    var isDef = function (val) {
        return val !== undefined;
    };

    var exportPath = function (name, opt_object, opt_objectToExportTo) {
        var parts = name.split('.');
        var cur = opt_objectToExportTo || window;
        // Parentheses added to eliminate strict JS warning in Firefox.
        for (var part; parts.length && (part = parts.shift());) {
            if (!parts.length && isDef(opt_object)) {
                // last part and we have an object; use it
                cur[part] = opt_object;
              }else if(!parts.length){
                return cur[part];
            } else if (cur[part]) {
                cur = cur[part];
            } else {
                cur = cur[part] = {};
            }
        }
    };
    var populateWithSlot = function(cl,instance,s){
      var S = capitaliseFirstLetter(s);
      var uS = "update" + S;
      if (cl['effectiveSlots'][s]){
        var type = typeof cl['effectiveSlots'][s];
        if (type == "number" || type == "string"){
          instance['$' + s] = cl['effectiveSlots'][s];
        }else{
          instance['$' + s] = clone(cl['effectiveSlots'][s]); 
        }
      }else{
        instance['$' + s] = cl['effectiveSlots'][s];
      }
      Object.defineProperty(instance, s, {
          get: function () {
              return this['$' + s];
          },
          set: function (nV) {
              this[uS] && this[uS](nV, this[s]);
              this["updateAnySlot"] && this["updateAnySlot"](s,nV,this[s]);
              this['$' + s] = nV;
          },
          enumerable:true
      })
      instance["reset" + S] = function () {
          this[s] = clone(cl['effectiveSlots'][s]);
      }
    }
    var capitaliseFirstLetter = function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    function Vanilla () {}

    window.Vanilla = Vanilla
    Vanilla['class'] = {
        methods : {toString:function () {
            return "#" + this['class'].getCanonicalName()
        }},
        classDef : {toString:function () {
            return "#" + this['class'].getCanonicalName()
        }
      }
    }

    var Class = function () {};
    Class.classProcessorOrder = ['statics','slots','mixins','consts', 'constructor'];
    Class.classProcessors = {
        'mixins' : {
          onDeclare: function (cl, data) {
            if(data){
              cl['mixins'] = [];
              for (var i=0; i < data.length; i++) {
                var c = data[i];
                if (typeof c == "string"){
                  data[i] = Class.requires(data[i]);
                }
                cl['mixins'].push(data[i]['class'])
              };
            }
          },
          onInitClass: function (cl) {
             if (cl['mixins']){
              for (var i=0; i < cl['mixins'].length; i++) {
                var mx = cl['mixins'][i]
                cl['effectiveSlots'] = cl['effectiveSlots'] || {}
                for(var s in mx['effectiveSlots']){
                  cl['effectiveSlots'][s] = mx['effectiveSlots'][s];
                }
                cl['methods'] = cl['methods'] || {}
                for(var m in mx['methods']){
                  cl['methods'][m] = mx['methods'][m];
                }
              }
              }
           }
        },
        'statics': {
            onDeclare: function (cl, data) {
              if(data){
                cl['statics'] = data;
              }
            },
            onInitClass: function (cl,ctr) {
                for (var k in cl['statics']) {
                  ctr[k] = cl['statics'][k];
                }
            }
        },

        'slots': {
            onDeclare: function (cl, data) {
              if(data){
                cl['slots'] = data;
              }
            },
            onInitClass: function(cl){
              if(cl['extends'] != Vanilla.class){
                cl['effectiveSlots'] = {}
                for(var k in cl['extends']['effectiveSlots']){
                  cl['effectiveSlots'][k] = cl['extends']['effectiveSlots'][k]
                }
                for(var k in cl['slots']){
                  cl['effectiveSlots'][k] = cl['slots'][k]
                }
              }else{
                cl['effectiveSlots'] = cl['slots']
              }
            },
            onInitInstance: function (instance) {
                var cl = instance['class'];
                for (var s in cl['effectiveSlots']) {
                  populateWithSlot(cl,instance,s);
                }
            }
        },
        'consts': {
          onDeclare: function (cl, data) {
            if(data){
              cl['consts'] = data;
            }
          },
          onInitClass: function(cl,ctr){
            if (cl['consts']){
             for(var k in cl['consts']){
                Object.defineProperty(ctr,k,{
                  value:cl['consts'][k],
                  writable:false,
                  configurable:false,
                  enumerable:true
                })                
              }
            }
          }
        },
        'constructor': {
            onDeclare: function (cl, data) {
              if(data){
                cl['ctr'] = data;
              }else{
                cl['ctr'] = null;
              }
            },
            onInitClass: function (cl) {
              if (cl['ctr'] == "autoConfig"){
                cl['ctr'] = function(cfg){
                  if(cfg){
                    Class.config(this,cfg);
                  }
                }
              }else if (!cl['ctr']){
                cl['ctr'] = cl['extends']['ctr'];
              }else if (typeof cl['ctr'] != "function"){
                throw "Expecting constructor as function or 'autoConfig'";
              }

              cl.classDef['ctr'] = cl['ctr']
            }
        },
        
        'vanillaToString': {
            onInitInstance: function (instance) {
                var cl = instance['class'];
                if (!cl.methods['toString']) {
                    instance['toString'] = Vanilla['class'].methods.toString;
                }
            }
        }
    }
    var Class = (function () {
        var cl = function () {
            var i = Object.create(cl.classDef)
            cl.initInst(i)
            cl['ctr'].apply(i, arguments)
            return i;
        }

        cl.statics = {
            config: function(instance, config){
              var cl = instance['class'];
              for(var s in config){
                if(s === "class"){
                  continue;
                }
                if (!(s in cl['effectiveSlots'])){
                  System.warn("Config for non-slot '" + s + "' in #" + instance['class'].getCanonicalName())
                }
                instance[s] = config[s];
              }
            },
            super:function(instance,method){
              var m = instance.class.extends.methods[method];
              return m.apply(instance,Array.prototype.slice.call(arguments,2).slice(2));
            },
            requires: function(cl){
              // TODO: Lazyloading of classes;
              return Package.import(cl)
            },
            isDef: isDef,
            toObject: function(instance){
              var cl = instance['class'];
              var result = {};
              for(var s in cl['effectiveSlots']){
                result[s] = instance[s];
              }
              return result;
            },
            displayName: function(obj){
              if (obj['class']){
                return obj['class'].getCanonicalName();
              }else if(obj['callee']){
                var cl = obj['callee']['declared'];
                for(var m in cl['methods']){
                  if(cl['methods'][m] == obj['callee']){
                    var result = "";
                    for (var i=0; i < obj.length; i++) {
                      result += obj[i].toString();
                      if (i < obj.length - 1){
                        result += ",";
                      }
                    }
                    return cl.getCanonicalName() + "." + m + "(" + result + ")"
                  }
                }
                return "Unknown"
              }else if(obj['declared']){
                var cl = obj['declared'];
                for(var m in cl['methods']){
                  if(cl['methods'][m] == obj){
                    return cl.getCanonicalName() + "." + m + "()"
                  }
                }
              }
            },
            declare: function (cnName, def,_package) {
                var a = cnName.split(".");
                var name = a[a.length - 1];
                var i = cnName.lastIndexOf(".");
                var pkg = cnName.substring(0, i);
                def['className'] = name
                def['package'] = _package

                var cl = new Class(def)
                
                var x = function () {
                    var i = Object.create(cl.classDef)
                    cl.initInst(i)
                    cl['ctr'].apply(i, arguments)
                    return i;
                }
                cl.initClass(x);
                var that = cl;
                Object.defineProperty(x, "class", {
                    get: function () {
                        return that;
                    }
                });
                x.toString = function(){
                  return "#Constructor<" + cnName + ">"
                }
                exportPath(cnName, x)
                return x;
            },

            classProcessorOrder: Class.classProcessorOrder,
            classProcessors: Class.classProcessors,
            classesAvailable: {}

        }

        cl.slots = {
            className: null,
            'package': null,
            'extends': null,
            'effectiveSlots': null,
            slots: null,
            ctr: null,
            methods: null,
            statics: null,
            mixins: null
        }

        cl.ctr = function (definition) {
            if (typeof definition == "string"){
              return Class.requires(definition);
            }
            this['className'] = definition['className'];
            this['package'] = definition['package'];
            if (typeof definition['extends'] == "string"){
              definition['extends'] = cl.requires(definition['extends']);
            }
            this['extends'] = (definition['extends'] && definition['extends']['class']) || Vanilla['class'];
            delete definition['className'];
            delete definition['package'];
            definition['extends'] && delete definition['extends'];
            for (var i = 0; i < Class.classProcessorOrder.length; i++) {
                var name = Class.classProcessorOrder[i];

                if (definition[name]) {
                    var proc = Class.classProcessors[name];
                    var data = definition[name];
                    if (name == "constructor" && data == Object){
                      data = undefined
                    }else{
                      delete definition[name];
                    }
                    proc && proc.onDeclare && proc.onDeclare(this, data)
                }
            }
            
            // Defualt class processor;
            this['methods'] = this['methods'] || {}
            for (var k in definition) {
                if (typeof (definition[k]) != "function") {
                    throw "Method " + k + " is not a function : " 
                }
                this['methods'][k] = definition[k];
            }
            
            cl.classesAvailable[this.getCanonicalName()] = this
        }
        cl['extends'] = Vanilla['class']
        
        cl.methods = {
            initClass: function (ctr) {
                if (!this.classDef) {
                    this.classDef = Object.create(this['extends'].classDef)
                }
                
                for (var i = 0; i < Class.classProcessorOrder.length; i++) {
                    var name = Class.classProcessorOrder[i];
                    var proc = Class.classProcessors[name];
                    proc && proc.onInitClass && proc.onInitClass(this,ctr);
                }
                
                for (var m in this['methods']) {
                  this['methods'][m]['declared'] = this;
                  this.classDef[m] = this['methods'][m];
                    
                }
            },
            getCanonicalName: function () {
                if (this['package'] == "") {
                    return this['className'];
                } else {
                    return this['package'] + "." + this['className'];
                }
            },
            initInst: function (inst) {
                
                var that = this;
                if (that == Class){
                  that = Class.class
                }
                Object.defineProperty(inst, "class", {
                    get: function () {
                        return that;
                    },
                    configurable:true
                });
                for (var i = 0; i < Class.classProcessorOrder.length; i++) {
                    var name = Class.classProcessorOrder[i];
                    var proc = Class.classProcessors[name];
                    proc && proc.onInitInstance && proc.onInitInstance(inst)
                }
            },
            toString: function () {
                return "#Class<" + this.getCanonicalName() + ">";
            }
        }

        cl.initClass = cl.methods.initClass
        cl.initInst = cl.methods.initInst
        cl.initClass(cl)

        var clcl = Object.create(cl.classDef)
        cl.initInst(clcl); 
        
        cl.toString = function(){
          return "#Constructor<Class>"
        }
        
        cl.ctr.apply(clcl,[{
          'className':"Class",
          'package': "",
          slots : cl.slots,
          statics : cl.statics,
          ctr : cl.ctr,
          initClass : cl.methods.initClass,
          getCanonicalName : cl.methods.getCanonicalName,
          initInst : cl.methods.initInst,
          toString : cl.methods.toString
        }])
        Object.defineProperty(clcl, "class", {
            get: function () {
                return Class['class']
            },
        });
        Object.defineProperty(cl, "class", {
            get: function () {
                return clcl
            },
        });
        return cl;
    })()

    Class.declare("Vanilla", {
      constructor:function(){}
    })
    Vanilla = window.Vanilla;
    Vanilla['class']['extends'] = Vanilla['class'];
    
    Class.declare("Package", {
      statics:{
        packages:{},
        import: function (name) {
            var parts = name.split('.');
            var cur = window;
            // Parentheses added to eliminate strict JS warning in Firefox.
            for (var part; parts.length && (part = parts.shift());) {
                if(!parts.length){
                    return cur[part];
                } else if (cur[part]) {
                    cur = cur[part];
                } else {
                  return undefined;
                }
            }
        },
        declare: function(name,func) {
          var pkg = this.import(name);
          if(pkg && !func){
              return pkg;
          }else{
            var pkg = pkg || {};
            (func(pkg))
            exportPath(name,pkg);
            return pkg;
          }
        },
        requires: function (name){
          return Class.requires(name);
        }
    }})
    Class.declare("System",{
      statics:{
        log:function(obj){
          console.log(obj); //Change with intigos api
        },
        warn:function(obj){
          console.warn(obj);
        },
        currentApp:null,
      }
    })
    
    window.Class = Class
}())