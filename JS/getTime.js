function zeroFill(i){
    if (i >= 0 && i <= 9) {
        return "0" + i;
    } else {
        return i;
    }
}
function getTime(date) {
    var month = zeroFill(date.getMonth() + 1);//月
    var day = zeroFill(date.getDate());//日
    var hour = zeroFill(date.getHours());//时
    var minute = zeroFill(date.getMinutes());//分
    var second = zeroFill(date.getSeconds());//秒
    
    //当前时间
    var Time = date.getFullYear() + "-" + month + "-" + day
            + " " + hour + ":" + minute + ":" + second;
    
    return Time;
}
function getTimeYYYYMM(date) {
    var month = zeroFill(date.getMonth() + 1);//月
    
    //当前时间
    var Time = date.getFullYear() + "-" + month;
    
    return Time;
}
function getTimeHHmm(date) {
    console.log(typeof(date),date);
    var hour = zeroFill(date.getHours());//时
    var minute = zeroFill(date.getMinutes());//分
    //当前时间
    var Time = hour + ":" + minute;
    
    return Time;
}
