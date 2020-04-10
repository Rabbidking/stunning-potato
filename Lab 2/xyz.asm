default rel
section .text
global main
main:
undefined:
mov rax, 1
cmp rax, 0
je lbl0
mov rax, 0
cmp rax, 0
je lbl1
mov rax, 1
ret
lbl1:
jmp undefined
lbl0:
ret
section .data