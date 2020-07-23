// ==UserScript==
// @name        Betfair market snapshot
// @namespace   Violentmonkey Scripts
// @match       https://*betfair.com.au/exchange/*
// @grant       GM.xmlHttpRequest
// @version     1.0
// @author      -
// @description 
// ==/UserScript==

const INTERVAL = 1000
const INITIAL_DELAY = 3000
const LOG_ENDPOINT = 'http://localhost:23456/log'

let requestCounter = 0
function getMarketSnapshot()
{
  function toElemList(results)
  {
    let elems = []
    for (const e of results) { elems.push(e) }
    return elems
  }
  function getProbablyUniqueText(results)
  {
    return toElemList(results).map(e => e.innerText).join(';;')
  }
  
  const now = new Date().toISOString()
  let market_status = document.getElementsByClassName('market-status-label')
  if (market_status.length === 0) {
    console.log(`${now} - Failed to find market-status-label tag. Not logging.`)
    return
  }
  market_status = getProbablyUniqueText(market_status)

  const total_matched = getProbablyUniqueText(document.getElementsByClassName('total-matched'))
  const market_name = getProbablyUniqueText(document.getElementsByClassName('event-header'))
  
  let entries = []
  for (let table of document.getElementsByClassName('mv-runner-list')) {
    for (let entry of table.getElementsByTagName('tr')) {
      let entry_name = getProbablyUniqueText(entry.getElementsByClassName('runner-name'))
      let backs = [], lays = []
      for (let back of entry.getElementsByClassName('bet-buttons back-cell')) {
        backs.push({price: getProbablyUniqueText(back.getElementsByClassName('bet-button-price')),
                    size:  getProbablyUniqueText(back.getElementsByClassName('bet-button-size'))})
      }
      for (let lay of entry.getElementsByClassName('bet-buttons lay-cell')) {
        lays.push({price: getProbablyUniqueText(lay.getElementsByClassName('bet-button-price')),
                   size:  getProbablyUniqueText(lay.getElementsByClassName('bet-button-size'))})
      }
      entries.push({entry_name, backs, lays})
    }
  }

  requestCounter++
  const thisCounter = requestCounter
  console.log(`[${thisCounter}] Logging snapshot to endpoint: ${LOG_ENDPOINT}`)
  function print_response(response)
  {
    console.log(`[${thisCounter}] HTTP ${response.status} ${response.responseText}`)
  }
  const data = JSON.stringify({now, market_name, market_status, total_matched, entries})
  GM.xmlHttpRequest({url: LOG_ENDPOINT, method: 'POST', data,
                     timeout: 2*INTERVAL, onload: print_response, onerror: print_response})
}

window.setTimeout(function() {
    console.log(`Betfair market snapshot: started logging with interval ${INTERVAL} ms`)
    window.setInterval(getMarketSnapshot, INTERVAL)
}, INITIAL_DELAY)
