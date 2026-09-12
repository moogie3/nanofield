// Drops the benign dev-only console noise before React can print it:
// Turbopack "[Fast Refresh] rebuilding / done" lines and the React
// "Download the React DevTools" hint. Real errors never contain these
// strings, so genuine warnings and crashes still reach the console.
// Plain inline script (not next/script): it runs while the document parses,
// ahead of hydration, and no-ops in production (those messages only exist
// in development builds).
const SILENCER = `(function(){if(window.__nfConsolePatched)return;window.__nfConsolePatched=true;var drop=["Download the React DevTools","react.dev/link/react-devtools","[Fast Refresh]"];function hit(a){for(var i=0;i<a.length;i++){var v=a[i];if(typeof v==="string"){for(var j=0;j<drop.length;j++){if(v.indexOf(drop[j])!==-1)return true}}}return false}["log","info","warn","error","debug"].forEach(function(m){var o=console[m].bind(console);console[m]=function(){if(!hit(Array.prototype.slice.call(arguments)))o.apply(null,arguments)}})})();`

const ConsoleSilencer = () => {
  return <script dangerouslySetInnerHTML={{ __html: SILENCER }} />
}

export default ConsoleSilencer
