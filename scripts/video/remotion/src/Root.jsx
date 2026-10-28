// 1 composition / khuôn (content/video/formats.json) – id "fmt-<khuôn>". Props = timeline từ scripts/video/motion.mjs buildTimeline (render.mjs ghi props.json).
// Thời lượng/kích thước lấy từ props (calculateMetadata) nên cùng 1 composition dùng được cho mọi kịch bản của khuôn đó.
import React from 'react';
import { Composition } from 'remotion';
import formats from '../../../../content/video/formats.json';
import { Short } from './Short.jsx';
import { DEMO } from './demo.js';
import { PuppetSample } from './Puppet.jsx';
import { PuppetBg, metaBg } from './PuppetBg.jsx';

const meta = ({ props }) => ({ durationInFrames: Math.max(1, props.durationInFrames || 300), fps: props.fps || 30, width: props.w || 1080, height: props.h || 1920 });

export const Root = () => (
  <>
    {formats.formats.map(f => (
      <Composition key={f.id} id={`fmt-${f.id}`} component={Short} width={1080} height={1920} fps={30} durationInFrames={300}
        defaultProps={{ ...DEMO, format: f.id, hook: { ...DEMO.hook, pattern: f.hook.pattern, badge: f.hook.badge } }} calculateMetadata={meta} />
    ))}
    {/* 🎭 con rối 2D Ama – mẫu (scripts/puppet/sample.mjs → props.json; .github/workflows/puppet.yml) */}
    <Composition id="PuppetSample" component={PuppetSample} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={{ tl: {}, lines: [], words: [] }} calculateMetadata={meta} />
    {/* 🎭 so sánh nền con rối: phòng cũ mờ (old) vs cảnh 2.5D SVG (new) – .github/workflows/puppet-bg.yml */}
    <Composition id="PuppetBg" component={PuppetBg} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={{ tl: {}, lines: [], words: [], bg: 'new', seg: [0, 10] }} calculateMetadata={metaBg} />
  </>
);
