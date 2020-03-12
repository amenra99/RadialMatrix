const cos = Math.cos;
const sin = Math.sin;
const pi = Math.PI;

function toDegrees(angle) {
  return angle * (180 / pi);
}

function toRadians(angle) {
  return angle * (pi / 180);
}

function gerRtoXY(cx, cy, r, angle) {
	x = cos(toRadians(angle)) * r;
	y = sin(toRadians(angle)) * r;

	return {
		'x':  cx + x,
		'y':  cy + y
	};
}

function getTrangleXY(cx, cy, side, r) {
	x = cos(toRadians(60)) * side;
	y = sin(toRadians(60)) * side;
}

function getTranglePoints(cx, cy, r) {
	p1x = cx;
	p1y = cy - r;

	p2x = cx - cos(toRadians(30)) * r;
	p2y = cy + (r * sin(toRadians(30)));

	p3x = cx + cos(toRadians(30)) * r;
	p3y = p2y;

    return {
    	'p1x': p1x,
    	'p1y': p1y,
    	'p2x': p2x,
    	'p2y': p2y,
    	'p3x': p3x,
    	'p3y': p3y
    };
}

function getTranglePath(cx, cy, r) {
	var points = getTranglePoints(cx, cy, r);
    return [[points.p1x, points.p1y], [points.p2x, points.p2y], [points.p3x, points.p3y]].join(' ');
}

/*
Circle Arc
referenced by http://xahlee.info/js/svg_circle_arc.html
*/ 
const f_matrix_times = (([[a, b], [c, d]], [x, y]) => [a * x + b * y, c * x + d * y]);
const f_rotate_matrix = ((x) => {
    const cosx = cos(x);
    const sinx = sin(x);
    return [[cosx, -sinx], [sinx, cosx]];
});
const f_vec_add = (([a1, a2], [b1, b2]) => [a1 + b1, a2 + b2]);
const f_svg_ellipse_arc = (([cx, cy], [rx, ry], [t1, t2], rot) => {
	t1 = t1 / 180 * pi
	t2 = t2 / 180 * pi
	rot = rot / 180 * pi

    t2 = t2 % (2 * Math.PI);
    const rotMatrix = f_rotate_matrix(rot);
    const [sX, sY] = (f_vec_add(f_matrix_times(rotMatrix, [rx * cos(t1), ry * sin(t1)]), [cx, cy]));
    const [eX, eY] = (f_vec_add(f_matrix_times(rotMatrix, [rx * cos(t1 + t2), ry * sin(t1 + t2)]), [cx, cy]));
    const fA = ((t2 > Math.PI) ? 1 : 0);
    const fS = ((t2 > 0) ? 1 : 0);
    return [" M ", sX, " ", sY, " A ", rx, ry, rot / Math.PI * 180, fA, fS, eX, eY].join(' ');
});
