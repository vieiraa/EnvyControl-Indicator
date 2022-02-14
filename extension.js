/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'EnvyControlIndicator';

const { Gio, GObject, St, Clutter, GLib } = imports.gi;

const Dialog = imports.ui.dialog;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Self = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

const EnvyControlIndicator = GObject.registerClass(
    class EnvyControlIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('EnvyControl Indicator'));

            let [ok, currentMode, detectErr, exit] =
                GLib.spawn_command_line_sync("envycontrol --status");

            currentMode = currentMode.toString().split(": ")[1].replace("\n", "");

            this._statusIcon = new St.Icon({
                style_class: 'system-status-icon',
            });

            this._setIcon(currentMode);

            this.add_child(this._statusIcon);

            this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_(`Current mode: ${currentMode}`)));
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            if (currentMode !== "nvidia") {
                const switchToNVIDIA = new PopupMenu.PopupMenuItem(_('Switch to NVIDIA'));
                switchToNVIDIA.connect('activate', () => {
                    const dialog = new EnvyControlDialog("nvidia");
                    dialog.open(global.get_current_time());
                });
                this.menu.addMenuItem(switchToNVIDIA);
            }

            if (currentMode !== "integrated") {
                const switchToIntegrated = new PopupMenu.PopupMenuItem(_('Switch to Integrated'));
                switchToIntegrated.connect('activate', () => {
                    const dialog = new EnvyControlDialog("integrated");
                    dialog.open(global.get_current_time());
                });
                this.menu.addMenuItem(switchToIntegrated);
            }

            if (currentMode !== "hybrid") {
                const switchToHybrid = new PopupMenu.PopupMenuItem(_('Switch to Hybrid'));
                switchToHybrid.connect('activate', () => {
                    const dialog = new EnvyControlDialog("hybrid");
                    dialog.open(global.get_current_time());
                });
                this.menu.addMenuItem(switchToHybrid);
            }
        }

        _setIcon(iconName) {
            this._statusIcon.gicon = Gio.icon_new_for_string(
                Self.dir.get_child("icons").get_path() +
                "/primeindicator" +
                iconName +
                "symbolic.svg"
            );
        }
    }
);

const EnvyControlDialog = GObject.registerClass(
    class EnvyControlDialog extends ModalDialog.ModalDialog {
        _init(mode) {
            super._init({
                styleClass: "extension-dialog"
            });

            this._switch = {
                nvidia: "pkexec envycontrol --switch nvidia",
                integrated: "pkexec envycontrol --switch integrated",
                hybrid: "pkexec envycontrol --switch hybrid"
            }

            this._mode = mode;

            this.setButtons([
                {
                    label: _("No"),
                    action: this._onNoButtonPressed.bind(this),
                    key: Clutter.Escape
                },
                {
                    label: _("Yes"),
                    action: this._onYesButtonPressed.bind(this),
                    default: true
                }
            ])

            const content = new Dialog.MessageDialogContent({
                title: _("Do you want to swith to ") + this._mode + " mode?"
            })

            this.contentLayout.add(content)
        }

        _onNoButtonPressed() {
            this.close();
        }

        _onYesButtonPressed() {
            GLib.spawn_command_line_async(this._switch[this._mode]);
            this.close();

            const dialog = new RebootDialog();
            dialog.open(global.get_current_time());
        }
    }
);

const RebootDialog = GObject.registerClass(
    class RebootDialog extends ModalDialog.ModalDialog {
        _init(mode) {
            super._init({
                styleClass: "extension-dialog"
            });

            this._mode = mode;

            this.setButtons([
                {
                    label: _("Reboot later"),
                    action: this._onRebootLaterButtonPressed.bind(this),
                    key: Clutter.Escape
                },
                {
                    label: _("Reboot now"),
                    action: this._onRebootNowButtonPressed.bind(this),
                    default: true
                }
            ])

            const content = new Dialog.MessageDialogContent({
                title: _("You have to restart the computer to apply changes.\nDo you want to do it now?")
            })

            this.contentLayout.add(content)
        }

        _onRebootLaterButtonPressed() {
            this.close();
        }

        _onRebootNowButtonPressed() {
            GLib.spawn_command_line_sync("reboot");
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new EnvyControlIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
