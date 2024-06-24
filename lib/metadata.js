'use strict';

const cheerio = require('cheerio');
const common = require('./common');

function metadata (url) {
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

function parseEvents (html) {
  const $ = cheerio.load(html);

  const ele = $('script#shoebox-media-api-cache-apps');
  const data = JSON.parse(ele.html());
  const parsed = JSON.parse(data[Object.keys(data)[0]]);

  // console.log(JSON.stringify(parsed.d[0], null, 2));

  const events = Array.from(parsed.d[0].relationships['app-events'].data).map((e) => {
    const attrs = e.attributes;
    return {
      badgeKind: attrs.badgeKind,
      description: attrs.description,
      endDate: attrs.endDate,
      kind: attrs.kind,
      name: attrs.name,
      promotionStartDate: attrs.promotionStartDate,
      startDate: attrs.startDate,
      subtitle: attrs.subtitle,
      url: attrs.url,
      lockupArtwork: attrs.lockupArtwork
    };
  });
  const stories = Array.from(parsed.d[0].relationships['related-editorial-items'].data);
  const artwork = parsed.d[0].attributes.platformAttributes.ios.artwork;

  const videoPreviewsByType = parsed.d[0].attributes.platformAttributes.ios.videoPreviewsByType;
  let previewOnIphone6 = null;
  if (videoPreviewsByType && videoPreviewsByType['iphone6+'] && videoPreviewsByType['iphone6+'].length > 0) {
    previewOnIphone6 = videoPreviewsByType['iphone6+'][0].video;
  }
  const subtitle = parsed.d[0].attributes.platformAttributes.ios.subtitle;

  return {
    events,
    stories,
    artwork,
    subtitle,
    previewVideo: previewOnIphone6
  };
}
