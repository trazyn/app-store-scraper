'use strict';

const cheerio = require('cheerio');
const common = require('./common');

function metadata(url) {
  return new Promise(function (resolve) {
    if (!url) {
      throw Error('url is required');
    }

    resolve(common.request(url, {}, {}));
  }).then((html) => {
    if (html.length === 0) {
      throw Error('App not found (404)');
    }

    return parseEvents(html);
  });
}

module.exports = metadata;

function componentToHex(v) {
  // Accept 0-1 float or 0-255 int
  if (typeof v !== 'number' || Number.isNaN(v)) return '00';
  const n = v <= 1 ? Math.round(v * 255) : Math.round(v);
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
}

function rgbObjToHex(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    const s = obj.replace(/^#/, '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    return null;
  }
  if (typeof obj.red === 'number' && typeof obj.green === 'number' && typeof obj.blue === 'number') {
    return (
      componentToHex(obj.red) +
      componentToHex(obj.green) +
      componentToHex(obj.blue)
    ).toLowerCase();
  }
  return null;
}

function getArtwork(artwork) {
  // Extract artwork info from lockup artwork object
  if (!artwork) return null;

  //  "icon": {
  //   "checksum": null,
  //   "backgroundColor": {
  //     "red": 0.19607843137254902,
  //     "green": 0.25098039215686274,
  //     "blue": 0.4588235294117647,
  //     "type": "rgb"
  //   },
  //   "textColor": {
  //     "red": 0.9411764705882353,
  //     "green": 0.9490196078431372,
  //     "blue": 0.9764705882352941,
  //     "type": "rgb"
  //   },
  //   "style": "roundedRectPrerendered",
  //   "crop": "ia",
  //   "contentMode": null,
  //   "imageScale": null,
  //   "template": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/14/6e/95/146e956c-e470-1d22-46d5-5d9430d7d7ed/AppIcon-Global-1x_U007emarketing-0-8-0-85-220-0.png/{w}x{h}{c}.{f}",
  //   "width": 1024,
  //   "height": 1024,
  //   "variants": [
  //     {
  //       "format": "jpeg",
  //       "quality": 70,
  //       "supportsWideGamut": false
  //     }
  //   ]
  // },

  // Except:
  //     bgColor: '161a1c',
  // height: 1024,
  // textColor1: 'cbcccd',
  // textColor2: '7dd3f3',
  // textColor3: 'a6a9aa',
  // textColor4: '68aec8',
  // url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/bb/92/7a/bb927a8f-065e-93dc-553a-223565f07344/AppIcon-1761077053-1x_U007emarketing-0-8-0-85-220-0.png/{w}x{h}{c}.{f}',
  // width: 1024

  return {
    bgColor: rgbObjToHex(artwork.backgroundColor) || '161a1c',
    textColor1: rgbObjToHex(artwork.textColor) || 'cbcccd',
    height: artwork.height || 1024,
    width: artwork.width || 1024,
    textColor2: rgbObjToHex(artwork.textColor) || '7dd3f3',  // lighter
    textColor3: rgbObjToHex(artwork.textColor) || 'a6a9aa',  // darker
    textColor4: rgbObjToHex(artwork.textColor) || '68aec8',  // even lighter
    url: artwork.template || null,
  };
}

function transformArtwork(artwork) {
  // Convert an artwork object (moduleArtwork / artwork payload) into the
  // "lockupArtwork" mock format used in parseEvents:
  //
  // {
  //   bgColor: '4b5782',
  //   height: 1080,
  //   textColor1: 'f2ebe3',
  //   textColor2: 'bdcefc',
  //   textColor3: 'd1cdd0',
  //   textColor4: 'a6b6e3',
  //   url: 'https://.../{w}x{h}{c}.{f}',
  //   width: 1920
  // }
  if (!artwork) return null;

  // template/url
  const url = artwork.template || artwork.url || artwork.image || null;

  // width/height
  const width = artwork.width || (artwork.variants && artwork.variants[0] && artwork.variants[0].width) || 1920;
  const height = artwork.height || (artwork.variants && artwork.variants[0] && artwork.variants[0].height) || 1080;

  // background/text colors
  const bgHex = rgbObjToHex(artwork.backgroundColor) || rgbObjToHex(artwork.bgColor) || '4b5782';
  const textHex = rgbObjToHex(artwork.textColor) || rgbObjToHex(artwork.textColour) || 'f2ebe3';

  // Derive additional text colors by lightening/darkening the base text color slightly.
  function adjustHex(hex, amt) {
    if (!hex || hex.length !== 6) return hex || 'ffffff';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const nr = clamp(r + amt);
    const ng = clamp(g + amt);
    const nb = clamp(b + amt);
    return [nr, ng, nb].map(n => n.toString(16).padStart(2, '0')).join('');
  }

  const textColor1 = textHex;
  const textColor2 = adjustHex(textHex, 40);   // lighter
  const textColor3 = adjustHex(textHex, -40);  // darker
  const textColor4 = adjustHex(textHex, 80);   // even lighter

  return {
    bgColor: bgHex,
    height,
    textColor1,
    textColor2,
    textColor3,
    textColor4,
    url,
    width
  };
}

function parseEvents(html) {
  const $ = cheerio.load(html);

  const ele = $('script#serialized-server-data');
  const data = JSON.parse(ele.html());
  const appEvents = data[0].data.shelfMapping?.appEvents?.items || [];

  // console.log(JSON.stringify(appEvents, \null, 2));
  // console.log(JSON.stringify(data[0].data, null, 2));

  const events = Array.from(appEvents).map((e) => {
    const attrs = e;
    return {
      badgeKind: attrs.kind,
      description: {
        standard: attrs.detail,
      },
      endDate: attrs.endDate,
      startDate: attrs.startDate,
      kind: attrs.kind,
      name: attrs.title,
      subtitle: attrs.subtitle,
      promotionStartDate: attrs.startDate,
      url: attrs.clickAction.pageUrl,
      lockupArtwork: transformArtwork(attrs.moduleArtwork)
    };
  });
  const rawData = data[0].data;
  const stories = [];
  const artwork = getArtwork(rawData.lockup.icon);

  const videoPreviewsByType = rawData.videoPreviewsByType;
  let previewOnIphone6 = null;
  if (videoPreviewsByType && videoPreviewsByType['iphone6+'] && videoPreviewsByType['iphone6+'].length > 0) {
    previewOnIphone6 = videoPreviewsByType['iphone6+'][0].video;
  }
  const subtitle = rawData.lockup.subtitle;

  return {
    events,
    stories,
    artwork,
    subtitle,
    previewVideo: previewOnIphone6
  };
}
