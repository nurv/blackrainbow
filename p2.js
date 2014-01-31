


function giveBack(top){
    top.solve = function (v){
      if (this.scope){
        if (this.scope.names && v in this.scope.names){
          return [this.scope,this.scope.names[v]];
        }
      }
      if (this.parent){
          return this.parent.solve(v);
      }else{
          return null;
      }
  }
  top.nearestScope = function(){
      if (this.scope){
        return this.scope;
      }
      if (this.parent){
          return this.parent.nearestScope();
      }else{
          return null;
      }
  }
  top.isWithinToplevel = function(){
    return this.nearestScope().toplevel == true;
  }
  for (var i = 0; i < top.length; i++) {
    var z = top[i];
    if(Array.isArray(z)){
      z.parent = top
      giveBack(z);
    }
  }
}

