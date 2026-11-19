// Host layer registry of the Stitch shorts (docs/VIDEO-MOTION.md §host). The overlay never draws the teacher itself:
//   host = { kind: 'plate', src, box }                      – temporary placeholder: render_v9 footage plate (labelled PLACEHOLDER HOST)
//   host = { kind: 'puppet', who, line, cues, box, ... }    – the 2D/2.5D puppet (session puppet-2d-ama) registers its component here:
//          import { Teacher } from '../Puppet.jsx'; HOSTS.puppet = Teacher;   (one line, no other change to the stitch files)
// A host component receives { who, cues, box, t, fps, ...host } and draws inside box ([x0,y0,x1,y1] canvas px). The builder keeps the
// cards off the host's declared geometry (content/video/puppet/<who>.json: head box + body/hands envelope rows, via --host-geom).
export const HOSTS = {};
