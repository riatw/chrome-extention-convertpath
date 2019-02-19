function copyToClipboard(text) {
    function oncopy(event) {
        document.removeEventListener("copy", oncopy, true);
        // Hide the event from the page to prevent tampering.
        event.stopImmediatePropagation();

        // Overwrite the clipboard content.
        event.preventDefault();
        event.clipboardData.setData("text/plain", text);
    }

    document.addEventListener("copy", oncopy, true);

    // Requires the clipboardWrite permission, or a user gesture:
    document.execCommand("copy");
}

function getContentFromClipboard() {
    var result = '';
    var sandbox = document.getElementById('sandbox');
    sandbox.value = '';
    sandbox.select();
    if (document.execCommand('paste')) {
        result = sandbox.value;
        console.log('got value from sandbox: ' + result);
    }
    sandbox.value = '';
    return result;
}

/**
 * Send the value that should be pasted to the content script.
 */
function sendPasteToContentScript(toBePasted) {
    // We first need to find the active tab and window and then send the data
    // along. This is based on:
    // https://developer.chrome.com/extensions/messaging
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {data: toBePasted});
    });
}

chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
        id: "copy-win-to-mac",
        title: "Windows形式のパスをMac形式に変換してコピー",
        contexts: ["selection"]
    });

    // chrome.contextMenus.create({
    //     id: "copy-mac-to-win",
    //     title: "Mac形式のパスをWindows形式に変換してペースト",
    //     contexts: ["editable"]
    // });

    chrome.contextMenus.create({
        id: "convert-mac-to-win",
        title: "クリップボードのMac形式のパスをWindows形式に変換",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "convert-win-to-mac",
        title: "クリップボードのWindows形式のパスをMac形式に変換",
        contexts: ["all"]
    });

    function convert_mac_to_win() {
        var selection = getContentFromClipboard();

        if ( selection.indexOf("afp") != -1 ) {
            selection = selection.replace(/\//g,"\\").replace("afp:","").replace("FS1._afpovertcp._tcp.local","FS1");
        }
        else if ( selection.indexOf("GoogleDrive") != -1 ) {
            selection = selection.replace("/Volumes/GoogleDrive/","G:/").replace(/\//g,"\\");
        }
        else {
            selection = selection.replace("/Volumes/","//fs1/").replace(/\//g,"\\");
        }

        // Mac用のパスをWindows用に変換する時にファイル名が含まれていたら、最後の\の後で改行を入れる
        if ( selection.split("\\").pop().indexOf(".") != -1 ) {
            var path = selection.split("\\").slice(0, -1).join("\\");
            var filename = selection.split("\\").slice(-1);

            selection = path + "\n" + filename;
        }

        copyToClipboard(selection);
    }

    function convert_win_to_mac() {
        var selection = getContentFromClipboard();

        if ( selection.indexOf("G:") != -1 ) {
            selection = selection.normalize("NFC").replace(/\\/g,"/").replace(/G:\//gi,"/Volumes/GoogleDrive/");
        }
        else {
            selection = selection.normalize("NFC").replace(/\\/g,"/").replace(/\/fs1/gi,"Volumes");
        }

        // WindowsのパスをMac用に変換する時に改行コードが含まれていたら、/ に置き換えて一行にする
        selection = selection.replace(/\n/,"/");

        copyToClipboard(selection);
    }

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        var command = info.menuItemId;

        if ( info.menuItemId === "copy-win-to-mac" ) {
            var selection = info.selectionText;

            if ( selection.indexOf("G:") != -1 ) {
                selection = selection.normalize("NFC").replace(/\\/g,"/").replace(/G:\//gi,"/Volumes/GoogleDrive/");
            }
            else {
                selection = selection.normalize("NFC").replace(/\\/g,"/").replace(/\/fs1/gi,"Volumes");
            }

            copyToClipboard(selection);
        }

        // if ( info.menuItemId === "copy-mac-to-win" ) {
    	   //  var selection = getContentFromClipboard();

            // if ( selection.indexOf("afp") != -1 ) {
            //     selection = selection.replace(/\//g,"\\").replace("afp:","").replace("FS1._afpovertcp._tcp.local","FS1");
            // }
            // else if ( selection.indexOf("GoogleDrive") != -1 ) {
            //     selection = selection.replace("/Volumes/GoogleDrive/","G:/").replace(/\//g,"\\");
            // }
            // else {
            //     selection = selection.replace("/Volumes/","//fs1/").replace(/\//g,"\\");
            // }

        //     console.log(selection);

        //     copyToClipboard(selection);
    	   //  sendPasteToContentScript(selection);
        // }

        if ( command === "convert-mac-to-win" ) {
            convert_mac_to_win();
        }

        if ( command === "convert-win-to-mac" ) {
            convert_win_to_mac();
        }
    });

    chrome.commands.onCommand.addListener((command) => {
        if ( command === "convert-mac-to-win" ) {
            convert_mac_to_win();
        }

        if ( command === "convert-win-to-mac" ) {
            convert_win_to_mac();
        }
    });
});