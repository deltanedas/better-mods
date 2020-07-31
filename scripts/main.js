/*
	Copyright (c) DeltaNedas 2020

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

(() => {

const clean = str => Strings.stripColors(str).toLowerCase();

var rebuild, query = "";

/* Flatten buttons for better landscape viewing */
const moveButtons = (dialog, old) => {
	const btns = dialog.buttons;
	const cells = [];

	old.cells.each(cons(cell => cells.push(cell.get())));
	// Use our own close button
	cells.splice(0, 1);
	dialog.addCloseButton();

	btns.add(cells);
};

const buildMod = (mod, left, right) => {
	var parent = mod.enabled() ? left : right;
	const cell = parent.table(Tex.buttonSquare, cons(t => {
		if (mod.iconTexture) {
			t.addImage(new TextureRegion(mod.iconTexture))
				.center().left().size(80);
		}

		t.table(cons(body => {
			body.table(cons(title => {
				title.defaults().top().left();
				title.add(mod.meta.displayName())
					.get().fontScale = 1.5;
				if (mod.meta.author) {
					title.row();
					title.add(mod.meta.author).padLeft(8)
						.get().fontScale = 1.25;
				}

				title.row();
				title.add("[lightgray]v" + mod.meta.version);
			})).left().growX();

			body.table(cons(right => {
				right.addImageTextButton(mod.enabled() ? "$mod.disable" : "$mod.enable",
					mod.enabled() ? Icon.rightOpen : Icon.leftOpen, run(() => {
						Vars.mods.setEnabled(mod, !mod.enabled());
						rebuild();
					})
				).size(130, 50).margin(8).disabled(!mod.isSupported());

				right.addImageButton(Icon.trash, run(() => {
					Vars.ui.showConfirm("$confirm", "$mod.remove.confirm", run(() => {
						Vars.mods.removeMod(mod);
						rebuild();
					}));
				})).size(50).pad(4);
			})).right();
		})).left().growX();
	})).left().height(96).growX().pad(12);
	parent.row();
};

const setup = dialog => {
	const table = dialog.cont;
	table.clear();

	table.add("$mod.reloadrequired").visible(boolp(() => Vars.mods.requiresReload()))
		.center().get().alignment = Align.center;
	table.row();

	table.table(cons(search => {
		search.defaults().left();
		search.addImage(Icon.zoom).size(48);
		search.addField("", cons(text => {
			query = text;
			rebuild();
		})).growX();
	})).height(48).width(500).top();
	table.row();

	table.table(cons(table => {
		table.margin(10).top();
		const left = new Table(), right = new Table();
		table.add(new ScrollPane(left)).grow();
		table.addImage().growY().width(4).pad(12).color(Pal.gray);
		table.add(new ScrollPane(right)).grow();

		rebuild = () => {
			query = clean(query);
			left.clear(); right.clear();

			const mods = Vars.mods.list();
			for (var i = 0; i < mods.size; i++) {
				var mod = mods.get(i);
				if (query && !clean(mod.meta.displayName()).includes(query)) {
					continue;
				}

				buildMod(mod, left, right);
			}
		};
		rebuild();
	})).grow().pad(10);
};

const override = () => {
	const old = Vars.ui.mods;
	const d = new FloatingDialog("$mods");
	/* Avoid messing with MenuFragment */
	old.clearListeners();
	old.shown(run(() => {
		d.show();
		Core.app.post(run(() => {
			old.hide();
		}));
	}));

	moveButtons(d, old.buttons);
	setup(d);
	d.hidden(run(() => {
		if (Vars.mods.requiresReload()) {
			Vars.ui.loadAnd("$reloading", run(() => {
				Vars.mods.eachEnabled(cons(mod => {
					if (mod.hasUnmetDependencies()) {
						Vars.ui.showErrorMessage(Core.bundle.format("mod.nowdisabled",
							mod.meta.displayName(), mod.missingDependencies.toString(", ")));
					}
				}));
				Vars.mods.reloadContent();
			}));
		}
	}));
};

Events.on(EventType.ClientLoadEvent, run(() => {
	// TODO name reload check
	override();
}));

})();
