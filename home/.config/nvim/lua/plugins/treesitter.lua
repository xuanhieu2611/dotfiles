return {
  {
    'nvim-treesitter/nvim-treesitter',
    lazy = false,
    build = ':TSUpdate',
    config = function()
      require('nvim-treesitter').install({
        'bash', 'javascript', 'json', 'lua', 'nix', 'python', 'rust', 'swift',
        'tsx', 'typescript', 'vim', 'vimdoc',
      })

      vim.api.nvim_create_autocmd('FileType', {
        callback = function(event)
          pcall(vim.treesitter.start, event.buf)
        end,
      })
    end,
  },
}
