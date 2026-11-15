return {
  {
    'navarasu/onedark.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      require('onedark').setup({
        style = 'warmer',
        transparent = true,
        code_style = { comments = 'none', keywords = 'none' },
      })

      -- Use the editor background inside the Snacks picker, not the darker float background.
      vim.api.nvim_create_autocmd('ColorScheme', {
        pattern = 'onedark',
        callback = function()
          for _, group in ipairs({ 'SnacksPicker', 'SnacksPickerInput', 'SnacksPickerList', 'SnacksPickerPreview' }) do
            vim.api.nvim_set_hl(0, group, { link = 'Normal' })
          end
        end,
      })

      vim.cmd('colorscheme onedark')
    end,
  },
}
